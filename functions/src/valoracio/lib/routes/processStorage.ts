import express from "express";
import * as admin from "firebase-admin";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import * as logger from "firebase-functions/logger";
import {AppError} from "../utils/errors";
import {ProcessedFile, UploadResponse} from "../types";

const router = express.Router();

// Firebase Admin is initialized in the main index.ts
const storage = admin.storage();

// Function to extract text from PDF
async function extractPDFText(buffer: Buffer, filename: string): Promise<string> {
  try {
    logger.info("Extracting PDF text", {filename});
    const data = await pdf(buffer, {
      max: 100,
      version: "v1.10.100",
    });

    logger.info("PDF processed successfully", {
      filename,
      pages: data.numpages,
      characters: data.text.length,
    });

    if (!data.text || data.text.trim().length < 50) {
      throw new AppError(`PDF sin contenido suficiente: ${filename}`, 400);
    }

    return data.text;
  } catch (error) {
    logger.error("Error extracting PDF", {filename, error});
    throw new AppError(`Error procesando PDF ${filename}: ${error instanceof Error ? error.message : "Error desconocido"}`, 400);
  }
}

// Function to extract text from Word documents
async function extractWordText(buffer: Buffer, filename: string): Promise<string> {
  try {
    logger.info("Extracting Word text", {filename});
    const result = await mammoth.extractRawText({buffer});

    if (!result.value || result.value.trim().length < 10) {
      throw new AppError(`Documento Word vacío: ${filename}`, 400);
    }

    logger.info("Word processed successfully", {
      filename,
      characters: result.value.length,
    });

    return result.value;
  } catch (error) {
    logger.error("Error extracting Word document", {filename, error});
    throw new AppError(`Error procesando Word ${filename}: ${error instanceof Error ? error.message : "Error desconocido"}`, 400);
  }
}

// Function to process plain text
function extractTextContent(buffer: Buffer, filename: string): string {
  try {
    logger.info("Processing plain text file", {filename});
    const text = buffer.toString("utf-8");

    if (!text || text.trim().length < 10) {
      throw new AppError(`Archivo de texto vacío: ${filename}`, 400);
    }

    logger.info("Plain text processed successfully", {
      filename,
      characters: text.length,
    });

    return text;
  } catch (error) {
    logger.error("Error processing plain text", {filename, error});
    throw new AppError(`Error procesando texto ${filename}: ${error instanceof Error ? error.message : "Error desconocido"}`, 400);
  }
}

// Function to clean extracted content
function cleanTextContent(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, "")
    .replace(/\s+/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .join("\n")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

// Endpoint to process files from Firebase Storage
router.post("/", async (req, res, next) => {
  try {
    const {filePaths, type} = req.body;

    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      throw new AppError("No file paths provided", 400);
    }

    if (!type || !["specification", "proposal"].includes(type)) {
      throw new AppError("Invalid type", 400);
    }

    logger.info("Processing files from storage", {
      fileCount: filePaths.length,
      type,
    });

    const processedFiles: ProcessedFile[] = [];
    const bucket = storage.bucket();

    for (const filePath of filePaths) {
      try {
        // Download file from storage
        const file = bucket.file(filePath);
        const [buffer] = await file.download();
        const [metadata] = await file.getMetadata();

        const filename = filePath.split("/").pop() || "unknown";
        const contentType = metadata.contentType || "";

        logger.info("Downloaded file from storage", {
          filename,
          size: buffer.length,
          contentType,
        });

        let content = "";

        // Process based on file type
        if (contentType === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) {
          content = await extractPDFText(buffer, filename);
        } else if (contentType.includes("word") || filename.toLowerCase().endsWith(".docx") || filename.toLowerCase().endsWith(".doc")) {
          content = await extractWordText(buffer, filename);
        } else if (contentType === "text/plain" || filename.toLowerCase().endsWith(".txt")) {
          content = extractTextContent(buffer, filename);
        } else {
          throw new AppError(`Unsupported file type: ${filename}`, 400);
        }

        const cleanedContent = cleanTextContent(content);

        processedFiles.push({
          name: filename,
          content: cleanedContent,
          type: type as "specification" | "proposal",
          success: true,
          extractedLength: cleanedContent.length,
        });

        logger.info("File processed successfully", {
          filename,
          characters: cleanedContent.length,
        });
      } catch (error) {
        const filename = filePath.split("/").pop() || filePath;
        logger.error("Error processing file", {
          filename,
          error,
        });

        processedFiles.push({
          name: filename,
          content: "",
          type: type as "specification" | "proposal",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const summary = {
      total: filePaths.length,
      successful: processedFiles.filter((f) => f.success).length,
      failed: processedFiles.filter((f) => !f.success).length,
    };

    logger.info("Storage processing summary", summary);

    const response: UploadResponse = {
      success: true,
      files: processedFiles,
      summary,
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;

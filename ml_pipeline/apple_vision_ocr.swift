#!/usr/bin/env swift

import Foundation
import Vision
import ImageIO

struct PageResult: Codable {
  let path: String
  let text: String
}

struct OcrResult: Codable {
  let pages: [PageResult]
  let combinedText: String
}

enum OcrError: Error {
  case missingPath(String)
  case invalidImage(String)
}

func loadCGImage(from filePath: String) throws -> CGImage {
  let url = URL(fileURLWithPath: filePath)
  guard FileManager.default.fileExists(atPath: filePath) else {
    throw OcrError.missingPath(filePath)
  }
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    throw OcrError.invalidImage(filePath)
  }
  return image
}

func recognizeText(in cgImage: CGImage) throws -> String {
  var recognized = [String]()
  let request = VNRecognizeTextRequest { request, error in
    if let error {
      fputs("OCR request failed: \(error.localizedDescription)\n", stderr)
      return
    }
    guard let observations = request.results as? [VNRecognizedTextObservation] else {
      return
    }
    for observation in observations {
      if let top = observation.topCandidates(1).first {
        recognized.append(top.string)
      }
    }
  }
  request.recognitionLevel = .accurate
  request.usesLanguageCorrection = true
  request.recognitionLanguages = ["en-US", "es-ES"]

  let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
  try handler.perform([request])
  return recognized.joined(separator: "\n")
}

let imagePaths = Array(CommandLine.arguments.dropFirst())
if imagePaths.isEmpty {
  fputs("Usage: apple_vision_ocr.swift <image-path> [image-path...]\n", stderr)
  exit(1)
}

do {
  var pages = [PageResult]()
  pages.reserveCapacity(imagePaths.count)

  for path in imagePaths {
    let image = try loadCGImage(from: path)
    let text = try recognizeText(in: image)
    pages.append(PageResult(path: path, text: text))
  }

  let combined = pages.map(\.text).joined(separator: "\n\n")
  let result = OcrResult(pages: pages, combinedText: combined)
  let data = try JSONEncoder().encode(result)
  guard let output = String(data: data, encoding: .utf8) else {
    fputs("Failed to encode OCR JSON output.\n", stderr)
    exit(1)
  }
  print(output)
} catch {
  fputs("Apple Vision OCR failed: \(error)\n", stderr)
  exit(1)
}

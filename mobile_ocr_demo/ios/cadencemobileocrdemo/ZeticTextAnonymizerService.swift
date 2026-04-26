import Foundation

#if canImport(ZeticMLange)
import ZeticMLange
#endif

private enum ZeticTextAnonymizerError: LocalizedError {
  case emptyInput
  case missingPersonalKey
  case sdkNotLinked
  case invalidModelOutput

  var errorDescription: String? {
    switch self {
    case .emptyInput:
      return "Cannot anonymize empty text."
    case .missingPersonalKey:
      return "Missing Zetic personal key. Set EXPO_PUBLIC_ZETIC_PERSONAL_KEY in your app environment."
    case .sdkNotLinked:
      return "ZeticMLange SDK is not linked in iOS build settings. Rebuild after adding the package dependency."
    case .invalidModelOutput:
      return "Zetic model output shape is not compatible with text-anonymizer-v1."
    }
  }
}

private struct ZeticModelConfig {
  let personalKey: String
  let modelId: String
  let modelVersion: Int?

  var cacheKey: String {
    "\(personalKey)|\(modelId)|\(modelVersion ?? -1)"
  }
}

final class ZeticTextAnonymizerService {
  static let shared = ZeticTextAnonymizerService()

  private let queue = DispatchQueue(label: "com.cadence.zetic-anonymizer", qos: .userInitiated)
  private let maxSequenceLength = 128

  private let idToLabel: [Int: String] = [
    0: "O",
    1: "B-PERSON",
    2: "I-PERSON",
    3: "B-LOCATION",
    4: "I-LOCATION",
    5: "B-DATE",
    6: "I-DATE",
    7: "B-ADDRESS",
    8: "I-ADDRESS",
    9: "B-PHONE_NUMBER",
    10: "I-PHONE_NUMBER",
  ]

  private let placeholderByLabel: [String: String] = [
    "PERSON": "[Person]",
    "LOCATION": "[Location]",
    "DATE": "[Date]",
    "ADDRESS": "[Address]",
    "PHONE_NUMBER": "[Phone number]",
  ]

  #if canImport(ZeticMLange)
  private var model: ZeticMLangeModel?
  #endif
  private var loadedModelCacheKey = ""

  private init() {}

  func anonymize(
    text: String,
    options: [String: Any],
    completion: @escaping (Result<String, Error>) -> Void
  ) {
    queue.async {
      do {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
          throw ZeticTextAnonymizerError.emptyInput
        }

        let config = try self.parseConfig(from: options)

        #if canImport(ZeticMLange)
        let model = try self.loadModel(config: config)
        let anonymized = try self.runAnonymization(text: trimmed, model: model)
        completion(.success(anonymized))
        #else
        throw ZeticTextAnonymizerError.sdkNotLinked
        #endif
      } catch {
        completion(.failure(error))
      }
    }
  }

  private func parseConfig(from options: [String: Any]) throws -> ZeticModelConfig {
    let personalKey = (options["personalKey"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    guard !personalKey.isEmpty else {
      throw ZeticTextAnonymizerError.missingPersonalKey
    }

    let modelId = ((options["modelId"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines))
      .flatMap { $0.isEmpty ? nil : $0 } ?? "Steve/text-anonymizer-v1"

    let modelVersion: Int?
    if let value = options["modelVersion"] as? Int, value > 0 {
      modelVersion = value
    } else if let value = options["modelVersion"] as? NSNumber, value.intValue > 0 {
      modelVersion = value.intValue
    } else {
      modelVersion = nil
    }

    return ZeticModelConfig(personalKey: personalKey, modelId: modelId, modelVersion: modelVersion)
  }

  #if canImport(ZeticMLange)
  private func loadModel(config: ZeticModelConfig) throws -> ZeticMLangeModel {
    if let model, loadedModelCacheKey == config.cacheKey {
      return model
    }

    let loadedModel: ZeticMLangeModel
    if let version = config.modelVersion {
      loadedModel = try ZeticMLangeModel(
        personalKey: config.personalKey,
        name: config.modelId,
        version: version
      )
    } else {
      loadedModel = try ZeticMLangeModel(
        personalKey: config.personalKey,
        name: config.modelId
      )
    }

    self.model = loadedModel
    loadedModelCacheKey = config.cacheKey
    return loadedModel
  }

  private func runAnonymization(text: String, model: ZeticMLangeModel) throws -> String {
    let chunks = chunkTextByUtf8Length(text, maxBytes: maxSequenceLength)
    var anonymizedChunks: [String] = []
    anonymizedChunks.reserveCapacity(chunks.count)

    for chunk in chunks {
      if chunk.isEmpty {
        anonymizedChunks.append(chunk)
        continue
      }
      let chunkResult = try runChunkAnonymization(text: chunk, model: model)
      anonymizedChunks.append(chunkResult)
    }

    let combined = anonymizedChunks.joined()
    return applyStructuredFallbacks(combined)
  }

  private func runChunkAnonymization(text: String, model: ZeticMLangeModel) throws -> String {
    let utf8Bytes = Array(text.utf8)
    let validLength = utf8Bytes.count
    guard validLength > 0 else {
      return text
    }

    var inputIds = utf8Bytes.map { Int64($0) }
    var attentionMask = Array(repeating: Int64(1), count: validLength)
    if validLength < maxSequenceLength {
      let paddingCount = maxSequenceLength - validLength
      inputIds.append(contentsOf: Array(repeating: 0, count: paddingCount))
      attentionMask.append(contentsOf: Array(repeating: 0, count: paddingCount))
    }

    let inputIdsData = inputIds.withUnsafeBufferPointer { Data(buffer: $0) }
    let maskData = attentionMask.withUnsafeBufferPointer { Data(buffer: $0) }

    let inputTensor = Tensor(
      data: inputIdsData,
      dataType: BuiltinDataType.int64,
      shape: [1, maxSequenceLength]
    )
    let maskTensor = Tensor(
      data: maskData,
      dataType: BuiltinDataType.int64,
      shape: [1, maxSequenceLength]
    )

    let outputs = try model.run(inputs: [inputTensor, maskTensor])
    guard let outputTensor = outputs.first else {
      throw ZeticTextAnonymizerError.invalidModelOutput
    }

    let predictedClassIds = try decodePredictedClasses(from: outputTensor, sequenceLength: validLength)
    let spans = extractEntitySpans(predictedClassIds: predictedClassIds, validLength: validLength)
    return applySpans(spans, to: utf8Bytes)
  }

  private func decodePredictedClasses(
    from outputTensor: Tensor,
    sequenceLength: Int
  ) throws -> [Int] {
    let classCount = idToLabel.count
    guard classCount > 0 else {
      throw ZeticTextAnonymizerError.invalidModelOutput
    }

    let floats: [Float32] = outputTensor.data.withUnsafeBytes { rawBuffer in
      Array(rawBuffer.bindMemory(to: Float32.self))
    }

    guard floats.count >= sequenceLength * classCount else {
      throw ZeticTextAnonymizerError.invalidModelOutput
    }

    var predicted: [Int] = Array(repeating: 0, count: sequenceLength)
    for position in 0..<sequenceLength {
      let offset = position * classCount
      var maxIndex = 0
      var maxValue = -Float.greatestFiniteMagnitude
      for classIndex in 0..<classCount {
        let candidate = Float(floats[offset + classIndex])
        if candidate > maxValue {
          maxValue = candidate
          maxIndex = classIndex
        }
      }
      predicted[position] = maxIndex
    }

    return predicted
  }
  #endif

  private func extractEntitySpans(predictedClassIds: [Int], validLength: Int) -> [(start: Int, end: Int, type: String)] {
    var spans: [(start: Int, end: Int, type: String)] = []
    var index = 0

    while index < validLength {
      let label = idToLabel[predictedClassIds[index]] ?? "O"
      let entityType = normalizedEntityType(label)
      if entityType == nil {
        index += 1
        continue
      }

      let resolvedType = entityType!
      let start = index
      index += 1

      while index < validLength {
        let nextLabel = idToLabel[predictedClassIds[index]] ?? "O"
        if nextLabel == "I-\(resolvedType)" || nextLabel == "B-\(resolvedType)" {
          index += 1
          continue
        }
        break
      }

      spans.append((start: start, end: index, type: resolvedType))
    }

    return spans
  }

  private func applySpans(_ spans: [(start: Int, end: Int, type: String)], to bytes: [UInt8]) -> String {
    guard !spans.isEmpty else {
      return String(decoding: bytes, as: UTF8.self)
    }

    var outputBytes: [UInt8] = []
    var cursor = 0

    for span in spans {
      guard span.start >= cursor, span.end <= bytes.count, span.start < span.end else {
        continue
      }
      outputBytes.append(contentsOf: bytes[cursor..<span.start])
      let placeholder = placeholderByLabel[span.type] ?? "[\(span.type)]"
      outputBytes.append(contentsOf: placeholder.utf8)
      cursor = span.end
    }

    if cursor < bytes.count {
      outputBytes.append(contentsOf: bytes[cursor..<bytes.count])
    }

    return String(decoding: outputBytes, as: UTF8.self)
  }

  private func normalizedEntityType(_ label: String) -> String? {
    if label == "O" {
      return nil
    }
    if label.hasPrefix("B-") || label.hasPrefix("I-") {
      return String(label.dropFirst(2))
    }
    return label
  }

  private func chunkTextByUtf8Length(_ text: String, maxBytes: Int) -> [String] {
    guard !text.isEmpty, maxBytes > 0 else {
      return [text]
    }

    var chunks: [String] = []
    var currentChunk = ""
    var currentBytes = 0

    for character in text {
      let charString = String(character)
      let charBytes = charString.lengthOfBytes(using: .utf8)
      if currentBytes + charBytes > maxBytes, !currentChunk.isEmpty {
        chunks.append(currentChunk)
        currentChunk = charString
        currentBytes = charBytes
      } else {
        currentChunk.append(character)
        currentBytes += charBytes
      }
    }

    if !currentChunk.isEmpty {
      chunks.append(currentChunk)
    }
    return chunks
  }

  private func applyStructuredFallbacks(_ text: String) -> String {
    var output = text

    output = replaceRegex(
      "(?im)(\\bPatient\\s*:\\s*)([^\\n]+)",
      in: output,
      with: "$1[Person]"
    )
    output = replaceRegex(
      "(?im)(\\bMRN\\s*:\\s*)([A-Za-z0-9\\-]+)",
      in: output,
      with: "$1[MRN]"
    )
    output = replaceRegex(
      "(?im)(\\bAdmit\\s*:\\s*)(\\d{4}-\\d{2}-\\d{2}|\\d{2}/\\d{2}/\\d{4})",
      in: output,
      with: "$1[Date]"
    )
    output = replaceRegex(
      "(?im)(\\bDischarge\\s*:\\s*)(\\d{4}-\\d{2}-\\d{2}|\\d{2}/\\d{2}/\\d{4})",
      in: output,
      with: "$1[Date]"
    )
    output = replaceRegex(
      "\\b\\d{3}-\\d{2}-\\d{4}\\b",
      in: output,
      with: "[Identifier]"
    )
    output = replaceRegex(
      "\\b\\S+@\\S+\\.\\S+\\b",
      in: output,
      with: "[Email]"
    )
    output = replaceRegex(
      "\\b(?:\\+?\\d[\\d .\\-]{7,}\\d)\\b",
      in: output,
      with: "[Phone number]"
    )
    return output
  }

  private func replaceRegex(_ pattern: String, in text: String, with template: String) -> String {
    guard let regex = try? NSRegularExpression(pattern: pattern) else {
      return text
    }
    let range = NSRange(location: 0, length: text.utf16.count)
    return regex.stringByReplacingMatches(in: text, options: [], range: range, withTemplate: template)
  }
}

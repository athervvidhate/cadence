import Foundation
import React

@objc(ZeticAnonymizerModule)
final class ZeticAnonymizerModule: NSObject {
  @objc
  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc(anonymize:options:resolver:rejecter:)
  func anonymize(
    _ text: String,
    options: [String: Any]?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    ZeticTextAnonymizerService.shared.anonymize(text: text, options: options ?? [:]) { result in
      switch result {
      case .success(let anonymizedText):
        resolve(anonymizedText)
      case .failure(let error):
        let nsError = error as NSError
        reject("ZETIC_ANONYMIZE_FAILED", nsError.localizedDescription, nsError)
      }
    }
  }
}

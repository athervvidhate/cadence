#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(ZeticAnonymizerModule, NSObject)

RCT_EXTERN_METHOD(anonymize:(NSString *)text
                  options:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end

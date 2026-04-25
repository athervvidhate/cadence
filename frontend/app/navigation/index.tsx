// Stack navigator — no tab bar; initial route skips onboarding if patient already exists in store
import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import PatientProfileScreen from "../screens/Onboarding/PatientProfileScreen";
import VoiceRecordScreen from "../screens/Onboarding/VoiceRecordScreen";
import DischargeCaptureScreen from "../screens/Capture/DischargeCaptureScreen";
import BottleCaptureScreen from "../screens/Capture/BottleCaptureScreen";
import RegimenReviewScreen from "../screens/Capture/RegimenReviewScreen";
import CheckInScreen from "../screens/CheckIn/CheckInScreen";
import { usePatientStore } from "../store/patient";

export type RootStackParamList = {
  PatientProfile: undefined;
  VoiceRecord: undefined;
  DischargeCapture: undefined;
  BottleCapture: undefined;
  RegimenReview: undefined;
  CheckIn: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  // Read once at mount — skip onboarding if this session already has a patient
  // usePatientStore.getState() avoids subscribing and causing re-renders
  const hasPatient = Boolean(usePatientStore.getState().patientId);

  return (
    <Stack.Navigator
      initialRouteName={hasPatient ? "CheckIn" : "PatientProfile"}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="PatientProfile" component={PatientProfileScreen} />
      <Stack.Screen name="VoiceRecord" component={VoiceRecordScreen} />
      <Stack.Screen name="DischargeCapture" component={DischargeCaptureScreen} />
      <Stack.Screen name="BottleCapture" component={BottleCaptureScreen} />
      <Stack.Screen name="RegimenReview" component={RegimenReviewScreen} />
      <Stack.Screen name="CheckIn" component={CheckInScreen} />
    </Stack.Navigator>
  );
}

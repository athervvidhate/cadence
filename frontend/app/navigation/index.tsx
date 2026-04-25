// Stack navigator — no tab bar; initial route skips onboarding if patient already exists in store
import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import WelcomeScreen from "../screens/Onboarding/WelcomeScreen";
import PatientProfileScreen from "../screens/Onboarding/PatientProfileScreen";
import DischargeCaptureScreen from "../screens/Capture/DischargeCaptureScreen";
import BottleCaptureScreen from "../screens/Capture/BottleCaptureScreen";
import RegimenReviewScreen from "../screens/Capture/RegimenReviewScreen";
import VoiceRecordScreen from "../screens/Onboarding/VoiceRecordScreen";
import PlanReadyScreen from "../screens/Onboarding/PlanReadyScreen";
import CheckInScreen from "../screens/CheckIn/CheckInScreen";
import { usePatientStore } from "../store/patient";

export type RootStackParamList = {
  Welcome: undefined;
  PatientProfile: undefined;
  DischargeCapture: undefined;
  BottleCapture: undefined;
  RegimenReview: undefined;
  VoiceRecord: undefined;
  PlanReady: undefined;
  CheckIn: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  // Read once at mount — skip onboarding if patient already established
  const hasPatient = Boolean(usePatientStore.getState().patientId);

  return (
    <Stack.Navigator
      initialRouteName={hasPatient ? "CheckIn" : "Welcome"}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="PatientProfile" component={PatientProfileScreen} />
      <Stack.Screen name="DischargeCapture" component={DischargeCaptureScreen} />
      <Stack.Screen name="BottleCapture" component={BottleCaptureScreen} />
      <Stack.Screen name="RegimenReview" component={RegimenReviewScreen} />
      <Stack.Screen name="VoiceRecord" component={VoiceRecordScreen} />
      <Stack.Screen name="PlanReady" component={PlanReadyScreen} />
      <Stack.Screen name="CheckIn" component={CheckInScreen} />
    </Stack.Navigator>
  );
}

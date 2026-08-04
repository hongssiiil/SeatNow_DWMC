/* eslint-disable no-undef */
// Jest가 로드하는 CommonJS 설정 파일 — jest/require 전역을 사용한다.
// AsyncStorage는 네이티브 모듈이라 Jest에서 공식 mock으로 대체한다.
// https://react-native-async-storage.github.io/async-storage/docs/advanced/jest
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

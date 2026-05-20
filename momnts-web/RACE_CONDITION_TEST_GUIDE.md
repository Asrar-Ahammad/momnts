# Race Condition Test Suite - Setup & Execution Guide

## Overview
This test suite validates that the lifecycle guarding fix in `SelfieUploadModal.tsx` prevents camera stream leaks under race condition scenarios.

## Test Scenarios Covered

### 1. **Modal Closes While getUserMedia Pending**
- **Scenario**: User closes modal before camera permission is granted
- **Validates**: Stream is cleaned up even when `getUserMedia` resolves after modal closes
- **Expected**: `videoTrack.stop()` and `audioTrack.stop()` are called

### 2. **Navigation Away During getUserMedia**
- **Scenario**: User clicks back button to leave camera mode while permission dialog is open
- **Validates**: Stale stream is immediately stopped, not set to state
- **Expected**: Guards prevent `setStream` call, stream tracks are stopped

### 3. **Rapid Camera Switches**
- **Scenario**: User rapidly switches between cameras 3+ times before first permission resolves
- **Validates**: Only the final stream is active; previous streams are cleaned up
- **Expected**: Multiple `getUserMedia` calls, but no stream leaks

### 4. **Component Unmount During getUserMedia**
- **Scenario**: Component unmounts/remounts while `getUserMedia` promise is pending
- **Validates**: `isMountedRef` prevents state updates after unmount
- **Expected**: Stream cleanup occurs without triggering setState on unmounted component

### 5. **Error Handling After Modal Close**
- **Scenario**: Permission error occurs after modal closes
- **Validates**: Error state is not set after component is no longer in camera mode
- **Expected**: `setCameraError` is guarded and not called

### 6. **Stream Binding Verification**
- **Scenario**: Stream successfully binds to video element
- **Validates**: Happy path works correctly after guards are in place
- **Expected**: Video element receives stream without errors

---

## Setup Instructions

### Step 1: Install Testing Dependencies
```bash
cd momnts-web
npm install --save-dev vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

### Step 2: Create Vitest Config
Create `vitest.config.ts` in the project root:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

### Step 3: Create Test Setup File
Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

### Step 4: Update package.json
Add to scripts section:
```json
"scripts": {
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:run": "vitest run"
}
```

---

## Running the Tests

### Run all tests (watch mode)
```bash
npm test
```

### Run tests once (CI mode)
```bash
npm run test:run
```

### Run only race condition tests
```bash
npm test -- SelfieUploadModal.race-condition.test.tsx
```

### Run with UI dashboard
```bash
npm run test:ui
```

---

## What Each Guard Does

### `isMountedRef`
- **Purpose**: Tracks component mount state
- **Prevents**: `setStream`, `setCameraError`, `setIsCameraLoading` after unmount
- **Set to `false`**: In cleanup effect on unmount

### `currentStepRef`
- **Purpose**: Tracks current step ('choice' or 'camera')
- **Prevents**: Accepting streams when user navigated away from camera step
- **Updated**: In dedicated useEffect that syncs with `step` state

### Guard Logic in `startCamera()`
```typescript
if (currentStepRef.current === 'camera' && isMountedRef.current) {
  setStream(mediaStream)
} else {
  mediaStream.getTracks().forEach((track) => track.stop())
}
```

---

## Expected Test Results

All 9 tests should pass:
```
✓ should cleanup stream if getUserMedia resolves after modal closes
✓ should cleanup stream if user navigates away during getUserMedia
✓ should prevent multiple stream leaks when rapidly switching cameras
✓ should cleanup on component unmount even if getUserMedia is still pending
✓ should not set camera error if modal is closed before error occurs
✓ should properly bind stream to video element once ready
✓ should call stopCamera on cleanup effect
```

---

## Debugging Tips

### If tests fail:
1. **Verify mocks are set up**: Check that `navigator.mediaDevices.getUserMedia` is properly mocked
2. **Check timing**: Some tests have 300-600ms delays to simulate real-world latency
3. **Review refs**: Ensure refs are being updated correctly in effect cleanup

### To add more delay for slower systems:
```typescript
getUserMediaDelay = 800; // Increase from 500ms
```

### To see detailed logs:
```typescript
console.log('currentStepRef:', currentStepRef.current);
console.log('isMountedRef:', isMountedRef.current);
```

---

## Integration with CI/CD

Add to your CI pipeline (e.g., GitHub Actions):
```yaml
- name: Run Tests
  run: npm run test:run
```

This ensures the race condition fix is validated on every commit.

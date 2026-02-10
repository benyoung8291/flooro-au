

# Fix Floor Plan Upload Getting Stuck on "Uploading..."

## Problem

The FloorPlanUpload component can get permanently stuck showing "Uploading..." because:

1. **No timeout on the storage upload** -- if the network is slow or the upload stalls, there's no fallback. The user sees the spinner forever.
2. **Missing `setIsUploading(false)` in the image success path** -- for images, the dialog closes so it's not visible, but the state is left dirty. If the dialog reopens, it may still show the spinner.
3. **No `finally` block** -- if `onImageUploaded` throws or the storage call hangs, the uploading state is never cleaned up.

## What Changes

### File: `src/components/editor/FloorPlanUpload.tsx`

1. **Add a timeout to the storage upload** -- wrap the `supabase.storage.upload` call in a `Promise.race` with a 60-second timeout so large file uploads don't hang indefinitely.

2. **Add a `finally` block** to the main `handleFile` try/catch to guarantee `setIsUploading(false)` is always called, regardless of what happens (except for the PDF analysis branch which handles its own state).

3. **Reset `isUploading` on the image success path** -- explicitly call `setIsUploading(false)` before closing the dialog for image uploads.

4. **Reset file input after upload attempt** -- clear the hidden file input value so the same file can be re-selected if the first attempt failed.

5. **Allow closing the dialog while uploading** -- if a user is stuck, they should be able to close the dialog and reset the state via the `onOpenChange` handler.

### Implementation Details

- Add a 60-second timeout around the storage upload call using `Promise.race`, matching the pattern already used for `analyzePdf`
- Move `setIsUploading(false)` into a `finally` block for the image path
- In `onOpenChange`, if the dialog is being closed, reset `isUploading`, `isAnalyzingPdf`, `pendingPdfUrl`, and `pdfAnalysis` state so the component is clean for next open
- Reset the file input element's value after each upload attempt to allow re-selection


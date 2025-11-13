# Bucket Switching API Endpoint

## Overview
This document describes the API endpoint used in the main server to support moving leads between buckets.

## Endpoint Details

### Change Lead Bucket
- **URL**: `/api/main-service/leads/change-lead-bucket`
- **Method**: `PUT`
- **Content-Type**: `application/json`

### Request Body
```json
{
  "lead_id": "string",
  "new_bucket_id": "string"
}
```

### Response
- **Success (200)**:
```json
{
  "status": "success",
  "message": "Lead moved successfully",
  "lead_id": "string",
  "new_bucket_id": "string"
}
```

- **Error (400)**:
```json
{
  "detail": "lead_id and new_bucket_id are required"
}
```

- **Error (404)**:
```json
{
  "detail": "Lead not found"
}
```

- **Error (404)**:
```json
{
  "detail": "Target bucket not found"
}
```

## Implementation Notes
✅ **API Endpoint Already Implemented**: The `/api/main-service/leads/change-lead-bucket` endpoint is already implemented in the main server (lines 703-730 in main-service.py).

## Frontend Integration
The desktop app now includes:
- **Floating BucketSelector Widget**: A modern floating dropdown that appears outside parent bounds
- **Scrollable Interface**: Built-in scrollbar for handling many buckets
- **Smart Positioning**: Automatically positions the dropdown to stay within viewport
- **Enhanced UX**: Loading states, hover effects, and smooth transitions
- `moveLeadToBucket` API function in `leadsService.js` using the existing endpoint
- Integration in `LeadCard` component to display bucket switching UI
- Proper state management in the leads page

## Key Features of the Floating Widget
- **Fixed Positioning**: Uses `position: fixed` to break out of parent container bounds
- **Smart Positioning**: Calculates optimal position based on viewport and button location
- **Scrollable Content**: Max height with overflow scroll for many buckets
- **Click Outside to Close**: Automatically closes when clicking outside
- **Loading States**: Shows spinner during API calls
- **Responsive Design**: Adapts to different screen sizes

## Testing
To test the functionality:
1. Ensure you have multiple buckets created
2. Navigate to the Leads tab
3. Select a bucket with leads
4. Click on a lead to view it
5. Click the bucket switching button (arrow icon) next to the current bucket name
6. A floating widget will appear with all available buckets
7. Click on any bucket to move the lead there
8. Verify the lead appears in the target bucket and disappears from the source bucket

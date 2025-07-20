# Firestore Indexes Setup Guide

## Required Indexes for Production

Based on the error messages, you need to create the following Firestore indexes:

### 1. Notifications Index
**Collection:** `artifacts/meeting-ai-mvp/notifications`
**Fields:**
- `userId` (Ascending)
- `createdAt` (Descending)
- `__name__` (Ascending)

**Index URL:** https://console.firebase.google.com/v1/r/project/meeting-ai-a3c96/firestore/indexes?create_composite=Cl9wcm9qZWN0cy9tZWV0aW5nLWFpLWEzYzk2L2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9hcnRpZmFjdHMvbWVldGluZy1haS1tdnAvbm90aWZpY2F0aW9ucy9pbmRleGVzL18QARoKCgZ1c2VySWQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC

### 2. Additional Recommended Indexes

#### Teams Collection
**Collection:** `artifacts/meeting-ai-mvp/teams`
**Fields:**
- `members.userId` (Ascending)
- `createdAt` (Descending)

#### User Meetings Collection
**Collection:** `artifacts/meeting-ai-mvp/users/{userId}/meetings`
**Fields:**
- `teamId` (Ascending)
- `createdAt` (Descending)

#### User Profiles Collection
**Collection:** `artifacts/meeting-ai-mvp/userProfiles`
**Fields:**
- `email` (Ascending)
- `displayName` (Ascending)

## How to Create Indexes

### Method 1: Using Firebase Console (Recommended)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `meeting-ai-a3c96`
3. Navigate to Firestore Database
4. Click on "Indexes" tab
5. Click "Create Index"
6. Add the fields as specified above

### Method 2: Using the Error Link
When you see the error in the console:
```
The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/meeting-ai-a3c96/firestore...
```

Simply click on that link and it will take you directly to create the required index.

### Method 3: Using Firebase CLI
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy indexes (if you have firestore.indexes.json)
firebase deploy --only firestore:indexes
```

## Firestore Indexes Configuration File

Create a `firestore.indexes.json` file in your project root:

```json
{
  "indexes": [
    {
      "collectionGroup": "notifications",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "teams",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "members.userId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "meetings",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        {
          "fieldPath": "teamId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

## Verification

After creating the indexes:

1. **Check Index Status**: In Firebase Console > Firestore > Indexes, verify all indexes show "Enabled" status
2. **Test Queries**: Try the operations that were failing (notifications, team queries)
3. **Monitor Performance**: Check that queries are running efficiently

## Common Issues

### Index Building Time
- Simple indexes: 1-5 minutes
- Complex indexes: 10-30 minutes
- Large datasets: Several hours

### Index Limits
- Maximum 200 composite indexes per database
- Maximum 20,000 index entries per document

## Next Steps

1. **Create the notifications index immediately** using the error link from your console
2. **Deploy the updated Firestore rules** to Firebase
3. **Test the application** to ensure permissions work correctly
4. **Monitor for additional index requirements** as you use more features

The most critical index right now is the notifications index, as that's causing the immediate errors you're seeing.
# Firestore Schema (Our Hidden Universe)

All paths are scoped by `coupleId` to isolate each couple's private data.

## Root

`/couples/{coupleId}`

Suggested document shape:

```json
{
  "createdAt": "serverTimestamp",
  "createdBy": "uid",
  "displayName": "Our Hidden Universe"
}
```

## Subcollections

### Members

`/couples/{coupleId}/members/{uid}`

```json
{
  "isTyping": false,
  "lastActiveAt": "serverTimestamp"
}
```

### Messages

`/couples/{coupleId}/messages/{messageId}`

Text message:

```json
{
  "type": "text",
  "senderId": "uid",
  "createdAt": "serverTimestamp",
  "seenBy": ["uid"],
  "reactions": ["Miss You ❤️"],
  "selfDestructAt": "ISO string or null",
  "encrypted": {
    "cipherText": "base64",
    "iv": "base64",
    "salt": "base64",
    "algorithm": "AES-GCM/PBKDF2-SHA256"
  }
}
```

Media message:

```json
{
  "type": "image or voice",
  "senderId": "uid",
  "createdAt": "serverTimestamp",
  "seenBy": ["uid"],
  "reactions": [],
  "mediaUrl": "https://...",
  "caption": "optional"
}
```

### Memories

`/couples/{coupleId}/memories/{memoryId}`

```json
{
  "date": "YYYY-MM-DD",
  "title": "string",
  "note": "string",
  "mediaType": "image or video",
  "mediaUrl": "string"
}
```

### Open When

`/couples/{coupleId}/openWhen/{letterId}`

```json
{
  "title": "Open when you miss me",
  "message": "string",
  "videoUrl": "optional",
  "musicUrl": "optional",
  "voiceUrl": "optional"
}
```

### Bucket List

`/couples/{coupleId}/bucketList/{itemId}`

```json
{
  "text": "string",
  "done": false
}
```

## Storage Layout

```
couples/{coupleId}/messages/{senderId}/{fileName}
couples/{coupleId}/memories/{fileName}
couples/{coupleId}/open-when/{fileName}
```

Storage is protected by `storage.rules` and requires authenticated users who exist under the couple member map in Firestore.

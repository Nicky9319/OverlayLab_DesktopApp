// const ipAddress = "http://127.0.0.1:8000";
const ipAddress = "http://206.189.128.242:8000";

// Small helper to perform fetch and return a consistent shape:
// { status_code: number, content: any }
const request = async (path, options = {}) => {
  const url = `${ipAddress}${path}`;
  const fetchOptions = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  try {
    const resp = await fetch(url, fetchOptions);
    let content;
    try {
      content = await resp.json();
    } catch (err) {
      // Non-JSON response
      content = { detail: await resp.text() };
    }

    return { status_code: resp.status, content };
  } catch (error) {
    console.error('Network error while calling', url, error);
    // Keep a consistent return shape for network errors
    return { status_code: 503, content: { detail: String(error) } };
  }
};

const getAllBuckets = async () => {
  const resp = await request('/api/main-service/buckets/get-all-buckets', { method: 'GET' });

  if (!resp || resp.status_code !== 200) {
    console.error('Failed to fetch buckets or non-200 response:', resp);
    return [];
  }

  const content = resp.content;

  // Normalize common response shapes to an array of buckets
  if (Array.isArray(content)) return normalizeBuckets(content);
  if (content && Array.isArray(content.buckets)) return normalizeBuckets(content.buckets);
  if (content && Array.isArray(content.content)) return normalizeBuckets(content.content);
  if (content && Array.isArray(content.data)) return normalizeBuckets(content.data);

  console.warn('Unexpected buckets response shape, returning empty list:', content);
  return [];
};

// Helper to normalize bucket object fields to { id, name }
const normalizeBuckets = (arr) => {
  return arr.map((b) => {
    if (!b || typeof b !== 'object') return null;
    const rawId = b.id || b.bucketId || b.bucket_id || b._id;
    const id = rawId != null ? String(rawId) : null;
    const name = b.name || b.bucketName || b.bucket_name || '';
    // Preserve other fields if needed
    return { id, name, ...b };
  }).filter(Boolean);
};

// small uuid generator for fallback ids
const generateFallbackId = () => 'id-' + Math.random().toString(16).slice(2, 10);

const addNewBucket = async (bucketName) => {
  if (!bucketName) {
    return { status_code: 400, content: { detail: 'bucket_name is required' } };
  }

  const resp = await request('/api/main-service/buckets/add-bucket', {
    method: 'POST',
    body: JSON.stringify({ bucket_name: bucketName }),
  });

  if (!resp || resp.status_code < 200 || resp.status_code >= 300) return resp;

  let content = resp.content || {};
  // Unwrap nested shapes like { content: { bucket: {...} } }
  const candidate = content.bucket || content.content || content.data || content;

  // If candidate is an array, take first
  if (Array.isArray(candidate)) content = candidate[0] || {};
  else content = candidate || {};

  // Normalize into { id, name }
  const id = content.bucketId || content.bucket_id || content.id || content._id;
  const name = content.bucketName || content.bucket_name || content.name || bucketName;

  const normalized = { id, name, ...content };

  return { status_code: resp.status_code, content: normalized };
};

const updateBucketName = async (bucketId, bucketName) => {
  if (!bucketId || !bucketName) {
    return { status_code: 400, content: { detail: 'bucket_id and bucket_name are required' } };
  }

  return await request('/api/main-service/buckets/update-bucket-name', {
    method: 'PUT',
    body: JSON.stringify({ bucket_id: bucketId, bucket_name: bucketName }),
  });
};

const deleteBucket = async (bucketId) => {
  if (!bucketId) {
    return { status_code: 400, content: { detail: 'bucket_id is required' } };
  }

  // DELETE with query param as the backend expects params
  const path = `/api/main-service/buckets/delete-bucket?bucket_id=${encodeURIComponent(bucketId)}`;
  return await request(path, { method: 'DELETE' });
};

export { getAllBuckets, addNewBucket, updateBucketName, deleteBucket };

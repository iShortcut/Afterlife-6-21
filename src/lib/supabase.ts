import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Please click "Connect to Supabase" button in the top right.'
  );
}

let supabase;

try {
  console.log('Initializing Supabase client with URL:', supabaseUrl);
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  throw new Error('Failed to initialize Supabase connection');
}

export { supabase };

export async function uploadImage(
  bucket: string, 
  path: string, 
  file: File
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from('memorial-media') // Use the new bucket
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Upload succeeded but no data returned');
    }

    const { data: publicUrlData } = supabase.storage
      .from('memorial-media') // Use the new bucket
      .getPublicUrl(data.path);

    if (!publicUrlData.publicUrl) {
      throw new Error('Failed to get public URL for uploaded file');
    }

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadImage:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}
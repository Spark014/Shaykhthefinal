import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Checks if a string is a valid HTTP or HTTPS URL.
 * Allows empty, null, or undefined strings as they might be optional fields.
 * @param string The string to validate.
 * @returns True if the string is a valid HTTP/HTTPS URL or if it's empty/null/undefined, false otherwise.
 */
export function isValidHttpUrl(string: string | null | undefined): boolean {
  if (!string || string.trim() === "") return true; // Allow empty or null URLs (they are optional)
  
  // Clean the string and check for duplicated URLs
  const cleanString = string.trim();
  
  try {
    const url = new URL(cleanString);
    const isValidProtocol = url.protocol === "http:" || url.protocol === "https:";
    
    // Additional validation for archive.org URLs with complex parameters
    if (isValidProtocol && url.hostname.includes('archive.org')) {
      // Archive.org URLs are valid even with complex query parameters
      return true;
    }
    
    return isValidProtocol;
  } catch (error) {
    console.warn('URL validation failed:', error);
    return false;
  }
}

/**
 * Detects and fixes duplicated URLs that may have been accidentally pasted twice.
 * @param string The potentially duplicated URL string.
 * @returns The cleaned URL string.
 */
export function cleanDuplicatedUrl(string: string | null | undefined): string {
  if (!string || string.trim() === "") return "";
  
  const cleanString = string.trim();
  
  // Check if the URL appears to be duplicated (contains http twice)
  const httpCount = (cleanString.match(/https?:\/\//g) || []).length;
  
  if (httpCount > 1) {
    // Find the first complete URL
    const firstHttpIndex = cleanString.indexOf('http');
    const secondHttpIndex = cleanString.indexOf('http', firstHttpIndex + 1);
    
    if (secondHttpIndex > 0) {
      // Extract the first URL
      const firstUrl = cleanString.substring(firstHttpIndex, secondHttpIndex);
      console.warn('Detected duplicated URL, using first occurrence:', firstUrl);
      return firstUrl;
    }
  }
  
  return cleanString;
}

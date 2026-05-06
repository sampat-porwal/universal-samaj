// Frontend/lib/validators.ts

// 1. Only Alphabets and Spaces (Names, Cities)
export const isAlphaOnly = (value: string): boolean => {
    return /^[A-Za-z\s]+$/.test(value);
};

// 2. Only Exact Integers (Quantities, PIN codes)
export const isExactNumber = (value: string): boolean => {
    return /^\d+$/.test(value);
};

// 3. Decimals up to 2 places (Prices, Currency)
export const isDecimal = (value: string): boolean => {
    return /^\d+(\.\d{1,2})?$/.test(value);
};

// 4. Valid Email Format
export const isValidEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

// 5. Valid Mobile Number (Indian Context: Starts with 6-9, exactly 10 digits)
export const isValidMobile = (value: string): boolean => {
    return /^[6-9]\d{9}$/.test(value);
};

// 6. Valid Aadhaar / Government ID (Exactly 12 digits, no letters/spaces)
export const isValidAadhaar = (value: string): boolean => {
    return /^\d{12}$/.test(value.replace(/\s/g, '')); // Removes spaces before checking
};

// 7. Valid PAN Card (Indian Context: 5 letters, 4 numbers, 1 letter)
export const isValidPAN = (value: string): boolean => {
    return /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value.toUpperCase());
};
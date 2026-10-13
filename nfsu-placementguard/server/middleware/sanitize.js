/**
 * Security and Data Protection Utilities
 */

/**
 * Escapes CSV values against CSV/Formula Injection (CWE-1236)
 * Prepending single-quote when field starts with =, +, -, @, \t, \r
 */
export function sanitizeCsvField(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  // If value begins with dangerous characters that spreadsheet software interprets as formulas
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }

  // Escape quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Masks sensitive personal contact information (PII)
 */
export function maskSensitiveStudentData(student, userRole) {
  if (!student) return student;

  // Administrators and Officers have legitimate administrative need for full PII
  if (userRole === 'Administrator' || userRole === 'Officer') {
    return student;
  }

  // Course Coordinators see full records for academic tracking
  if (userRole === 'Coordinator') {
    return student;
  }

  // Recruiters receive masked PII to prevent unauthorized off-platform outreach
  const maskedMobile = student.mobile ? student.mobile.replace(/(\+?\d{2,3}\s?\d{2})\d+(\d{2})/, '$1*****$2') : 'REDACTED';
  
  let maskedEmail = 'REDACTED';
  if (student.email && student.email.includes('@')) {
    const [local, domain] = student.email.split('@');
    maskedEmail = `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
  }

  return {
    ...student,
    mobile: maskedMobile,
    email: maskedEmail
  };
}

import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import {
  sanitizeText,
  sanitizeGoalTitle,
  sanitizeDescription,
  sanitizeBackground,
  sanitizeConstraints,
  sanitizeDate,
  sanitizeGoalFormData,
  escapeSqlChars,
  removeScriptPatterns,
  comprehensiveSanitize,
} from '../input-sanitizer';

describe('Input Sanitizer', () => {
  describe('sanitizeText', () => {
    it('should escape HTML characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitizeText(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('should escape special characters', () => {
      const input = '& < > " \' /';
      const result = sanitizeText(input);
      expect(result).toBe('&amp; &lt; &gt; &quot; &#x27; &#x2F;');
    });

    it('should handle empty string', () => {
      expect(sanitizeText('')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeText(null as any)).toBe('');
      expect(sanitizeText(undefined as any)).toBe('');
      expect(sanitizeText(123 as any)).toBe('');
    });

    it('should trim whitespace', () => {
      const input = '  test  ';
      const result = sanitizeText(input);
      expect(result).toBe('test');
    });
  });

  describe('sanitizeGoalTitle', () => {
    it('should remove line breaks and limit length', () => {
      const input = 'Goal\nwith\r\nline\tbreaks';
      const result = sanitizeGoalTitle(input);
      expect(result).toBe('Goal with line breaks');
    });

    it('should limit to 100 characters', () => {
      const input = 'a'.repeat(150);
      const result = sanitizeGoalTitle(input);
      expect(result.length).toBe(100);
    });

    it('should normalize multiple spaces', () => {
      const input = 'Goal   with    multiple     spaces';
      const result = sanitizeGoalTitle(input);
      expect(result).toBe('Goal with multiple spaces');
    });
  });

  describe('sanitizeDescription', () => {
    it('should preserve line breaks but limit consecutive ones', () => {
      const input = 'Line 1\n\n\n\nLine 2';
      const result = sanitizeDescription(input);
      expect(result).toBe('Line 1\n\nLine 2');
    });

    it('should limit to 1000 characters', () => {
      const input = 'a'.repeat(1500);
      const result = sanitizeDescription(input);
      expect(result.length).toBe(1000);
    });

    it('should normalize different line break types', () => {
      const input = 'Line 1\r\nLine 2\rLine 3';
      const result = sanitizeDescription(input);
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });
  });

  describe('sanitizeBackground', () => {
    it('should limit to 500 characters', () => {
      const input = 'a'.repeat(600);
      const result = sanitizeBackground(input);
      expect(result.length).toBe(500);
    });

    it('should handle line breaks properly', () => {
      const input = 'Background\n\nwith\n\n\nbreaks';
      const result = sanitizeBackground(input);
      expect(result).toBe('Background\n\nwith\n\nbreaks');
    });
  });

  describe('sanitizeConstraints', () => {
    it('should limit to 500 characters', () => {
      const input = 'a'.repeat(600);
      const result = sanitizeConstraints(input);
      expect(result.length).toBe(500);
    });

    it('should handle empty input', () => {
      expect(sanitizeConstraints('')).toBe('');
    });
  });

  describe('sanitizeDate', () => {
    it('should accept valid ISO date format', () => {
      const input = '2024-12-31';
      const result = sanitizeDate(input);
      expect(result).toBe('2024-12-31');
    });

    it('should reject invalid date formats', () => {
      expect(sanitizeDate('31/12/2024')).toBe('');
      expect(sanitizeDate('2024-13-01')).toBe('');
      expect(sanitizeDate('invalid-date')).toBe('');
    });

    it('should reject invalid dates', () => {
      expect(sanitizeDate('2024-02-30')).toBe('');
      expect(sanitizeDate('2024-04-31')).toBe('');
    });

    it('should handle non-string input', () => {
      expect(sanitizeDate(null as any)).toBe('');
      expect(sanitizeDate(undefined as any)).toBe('');
    });
  });

  describe('sanitizeGoalFormData', () => {
    it('should sanitize all fields', () => {
      const input = {
        title: '<script>alert("xss")</script>Goal Title',
        description: 'Description\n\n\nwith breaks',
        deadline: '2024-12-31',
        background: 'Background info',
        constraints: 'Some constraints',
      };

      const result = sanitizeGoalFormData(input);

      expect(result.title).not.toContain('<script>');
      expect(result.description).toBe('Description\n\nwith breaks');
      expect(result.deadline).toBe('2024-12-31');
      expect(result.background).toBe('Background info');
      expect(result.constraints).toBe('Some constraints');
    });

    it('should handle missing fields', () => {
      const input = {
        title: 'Goal Title',
      };

      const result = sanitizeGoalFormData(input);

      expect(result.title).toBe('Goal Title');
      expect(result.description).toBe('');
      expect(result.deadline).toBe('');
      expect(result.background).toBe('');
      expect(result.constraints).toBe('');
    });
  });

  describe('escapeSqlChars', () => {
    it('should escape SQL injection characters', () => {
      const input = "'; DROP TABLE users; --";
      const result = escapeSqlChars(input);
      expect(result).toBe("''\\; DROP TABLE users\\; \\--");
    });

    it('should escape stored procedure names', () => {
      const input = 'xp_cmdshell sp_executesql';
      const result = escapeSqlChars(input);
      expect(result).toBe('x_p_cmdshell s_p_executesql');
    });

    it('should handle comment patterns', () => {
      const input = '/* comment */ -- comment';
      const result = escapeSqlChars(input);
      expect(result).toBe('\\/\\* comment \\*\\/ \\-- comment');
    });
  });

  describe('removeScriptPatterns', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script>Safe content';
      const result = removeScriptPatterns(input);
      expect(result).toBe('Safe content');
    });

    it('should remove event handlers', () => {
      const input = 'onclick="alert(1)" onload="malicious()"';
      const result = removeScriptPatterns(input);
      expect(result).not.toContain('onclick=');
      expect(result).not.toContain('onload=');
    });

    it('should remove javascript: URLs', () => {
      const input = 'javascript:alert(1)';
      const result = removeScriptPatterns(input);
      expect(result).not.toContain('javascript:');
    });

    it('should remove dangerous functions', () => {
      const input = 'eval("malicious code") setTimeout("bad", 1000)';
      const result = removeScriptPatterns(input);
      expect(result).not.toContain('eval(');
      expect(result).not.toContain('setTimeout(');
    });
  });

  describe('comprehensiveSanitize', () => {
    it('should apply all sanitization methods', () => {
      const input =
        '<script>eval("alert(1)")</script>\'; DROP TABLE users; --<img onload="alert(1)">';
      const result = comprehensiveSanitize(input);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('eval(');
      // SQLエスケープ後は "DROP TABLE" が残るが、セミコロンがエスケープされる
      expect(result).toContain('DROP TABLE');
      expect(result).not.toContain('onload=');
    });

    it('should handle complex XSS attempts', () => {
      const input =
        'javascript:/*-/*`/*\\`/*\'/*"/**/(/* */oNcliCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert()//>\\x3e';
      const result = comprehensiveSanitize(input);

      expect(result).not.toContain('javascript:');
      expect(result).not.toContain('onclick');
      expect(result).not.toContain('onload');
      expect(result).not.toContain('<svg');
    });

    it('should preserve safe content', () => {
      const input = 'This is safe content with normal text.';
      const result = comprehensiveSanitize(input);
      expect(result).toBe('This is safe content with normal text.');
    });
  });
});

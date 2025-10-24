import {
  generateId,
  getFieldAriaAttributes,
  getErrorAriaAttributes,
  announceToScreenReader,
  focusManagement,
} from '../accessibility';

describe('accessibility utilities', () => {
  describe('generateId', () => {
    it('should generate unique IDs with prefix', () => {
      const id1 = generateId('test');
      const id2 = generateId('test');

      expect(id1).toMatch(/^test-/);
      expect(id2).toMatch(/^test-/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('getFieldAriaAttributes', () => {
    it('should return basic attributes', () => {
      const attributes = getFieldAriaAttributes('field-1');

      expect(attributes).toEqual({
        id: 'field-1',
        'aria-required': false,
        'aria-invalid': false,
      });
    });

    it('should handle required field', () => {
      const attributes = getFieldAriaAttributes('field-1', undefined, true);

      expect(attributes['aria-required']).toBe(true);
    });

    it('should handle field with error', () => {
      const attributes = getFieldAriaAttributes('field-1', 'Error message');

      expect(attributes['aria-invalid']).toBe(true);
      expect(attributes['aria-describedby']).toBe('field-1-error');
    });

    it('should handle field with custom describedBy', () => {
      const attributes = getFieldAriaAttributes('field-1', undefined, false, 'help-text');

      expect(attributes['aria-describedby']).toBe('help-text');
    });

    it('should combine error and describedBy', () => {
      const attributes = getFieldAriaAttributes('field-1', 'Error', false, 'help-text');

      expect(attributes['aria-describedby']).toBe('field-1-error help-text');
    });
  });

  describe('getErrorAriaAttributes', () => {
    it('should return error attributes', () => {
      const attributes = getErrorAriaAttributes('field-1');

      expect(attributes).toEqual({
        id: 'field-1-error',
        role: 'alert',
        'aria-live': 'polite',
      });
    });
  });

  describe('announceToScreenReader', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    it('should create announcement element', () => {
      announceToScreenReader('Test message');

      const announcement = document.querySelector('[aria-live="polite"]');
      expect(announcement).toBeInTheDocument();
      expect(announcement).toHaveTextContent('Test message');
      expect(announcement).toHaveClass('sr-only');
    });

    it('should remove announcement after timeout', done => {
      announceToScreenReader('Test message');

      const announcement = document.querySelector('[aria-live="polite"]');
      expect(announcement).toBeInTheDocument();

      setTimeout(() => {
        const removedAnnouncement = document.querySelector('[aria-live="polite"]');
        expect(removedAnnouncement).not.toBeInTheDocument();
        done();
      }, 1100);
    });
  });

  describe('focusManagement', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <button id="btn1">Button 1</button>
        <input id="input1" type="text" />
        <select id="select1">
          <option>Option 1</option>
        </select>
        <textarea id="textarea1"></textarea>
        <button id="btn2">Button 2</button>
      `;
    });

    describe('setFocus', () => {
      it('should focus element', () => {
        const button = document.getElementById('btn1') as HTMLButtonElement;
        focusManagement.setFocus(button);

        expect(document.activeElement).toBe(button);
      });

      it('should handle null element', () => {
        expect(() => {
          focusManagement.setFocus(null);
        }).not.toThrow();
      });
    });

    describe('getNextFocusableElement', () => {
      it('should return next focusable element', () => {
        const button = document.getElementById('btn1') as HTMLButtonElement;
        const nextElement = focusManagement.getNextFocusableElement(button);

        expect(nextElement?.id).toBe('input1');
      });

      it('should return null for last element', () => {
        const button = document.getElementById('btn2') as HTMLButtonElement;
        const nextElement = focusManagement.getNextFocusableElement(button);

        expect(nextElement).toBeNull();
      });
    });

    describe('getPreviousFocusableElement', () => {
      it('should return previous focusable element', () => {
        const input = document.getElementById('input1') as HTMLInputElement;
        const previousElement = focusManagement.getPreviousFocusableElement(input);

        expect(previousElement?.id).toBe('btn1');
      });

      it('should return null for first element', () => {
        const button = document.getElementById('btn1') as HTMLButtonElement;
        const previousElement = focusManagement.getPreviousFocusableElement(button);

        expect(previousElement).toBeNull();
      });
    });
  });
});

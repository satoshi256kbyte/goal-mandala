import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccessibleList } from '../AccessibleList';

describe('AccessibleList', () => {
  describe('基本機能', () => {
    it('should render children correctly', () => {
      render(
        <AccessibleList>
          <div role="listitem">Item 1</div>
          <div role="listitem">Item 2</div>
          <div role="listitem">Item 3</div>
        </AccessibleList>
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('should have role="list"', () => {
      render(
        <AccessibleList>
          <div role="listitem">Item</div>
        </AccessibleList>
      );

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <AccessibleList className="custom-class">
          <div role="listitem">Item</div>
        </AccessibleList>
      );

      const list = screen.getByRole('list');
      expect(list).toHaveClass('custom-class');
    });
  });

  describe('アクセシビリティ', () => {
    it('should have aria-label when provided', () => {
      render(
        <AccessibleList aria-label="Test List">
          <div role="listitem">Item</div>
        </AccessibleList>
      );

      const list = screen.getByRole('list', { name: 'Test List' });
      expect(list).toBeInTheDocument();
      expect(list).toHaveAttribute('aria-label', 'Test List');
    });

    it('should have aria-labelledby when provided', () => {
      render(
        <div>
          <h2 id="list-heading">List Heading</h2>
          <AccessibleList aria-labelledby="list-heading">
            <div role="listitem">Item</div>
          </AccessibleList>
        </div>
      );

      const list = screen.getByRole('list');
      expect(list).toHaveAttribute('aria-labelledby', 'list-heading');
    });

    it('should work without aria-label or aria-labelledby', () => {
      render(
        <AccessibleList>
          <div role="listitem">Item</div>
        </AccessibleList>
      );

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
      expect(list).not.toHaveAttribute('aria-label');
      expect(list).not.toHaveAttribute('aria-labelledby');
    });
  });

  describe('エッジケース', () => {
    it('should render empty list', () => {
      render(<AccessibleList />);

      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
      expect(list).toBeEmptyDOMElement();
    });

    it('should render with single child', () => {
      render(
        <AccessibleList>
          <div role="listitem">Single Item</div>
        </AccessibleList>
      );

      expect(screen.getByText('Single Item')).toBeInTheDocument();
    });

    it('should render with many children', () => {
      const items = Array.from({ length: 100 }, (_, i) => `Item ${i + 1}`);

      render(
        <AccessibleList>
          {items.map((item, index) => (
            <div key={index} role="listitem">
              {item}
            </div>
          ))}
        </AccessibleList>
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 100')).toBeInTheDocument();
    });

    it('should handle nested elements', () => {
      render(
        <AccessibleList>
          <div role="listitem">
            <span>Nested</span> <strong>Content</strong>
          </div>
        </AccessibleList>
      );

      expect(screen.getByText('Nested')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});

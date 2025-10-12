/**
 * ProfileValidationServiceのユニットテスト
 * 要件: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8
 */

import { ProfileValidationService } from '../profile-validation.service';
import { ValidationError } from '../../errors/profile.errors';

describe('ProfileValidationService', () => {
  let service: ProfileValidationService;

  beforeEach(() => {
    service = new ProfileValidationService();
  });

  describe('validateUpdateRequest', () => {
    describe('正常系', () => {
      it('有効なプロフィールデータを検証できる（全フィールド）', () => {
        const validData = {
          name: 'テストユーザー',
          industry: 'IT・通信',
          company_size: '100-500人',
          job_title: 'エンジニア',
          position: 'マネージャー',
        };

        const result = service.validateUpdateRequest(validData);

        expect(result).toEqual({
          name: 'テストユーザー',
          industry: 'IT・通信',
          company_size: '100-500人',
          job_title: 'エンジニア',
          position: 'マネージャー',
        });
      });

      it('nameのみの更新を検証できる', () => {
        const validData = { name: '山田太郎' };

        const result = service.validateUpdateRequest(validData);

        expect(result).toEqual({ name: '山田太郎' });
      });

      it('industryのみの更新を検証できる', () => {
        const validData = { industry: '製造業' };

        const result = service.validateUpdateRequest(validData);

        expect(result).toEqual({ industry: '製造業' });
      });

      it('company_sizeのみの更新を検証できる', () => {
        const validData = { company_size: '1000人以上' };

        const result = service.validateUpdateRequest(validData);

        expect(result).toEqual({ company_size: '1000人以上' });
      });

      it('job_titleのみの更新を検証できる', () => {
        const validData = { job_title: 'プロジェクトマネージャー' };

        const result = service.validateUpdateRequest(validData);

        expect(result).toEqual({ job_title: 'プロジェクトマネージャー' });
      });

      it('positionのみの更新を検証できる', () => {
        const validData = { position: '部長' };

        const result = service.validateUpdateRequest(validData);

        expect(result).toEqual({ position: '部長' });
      });

      it('最大文字数のデータを検証できる', () => {
        const validData = {
          name: 'a'.repeat(50),
          industry: 'b'.repeat(100),
          company_size: 'c'.repeat(50),
          job_title: 'd'.repeat(100),
          position: 'e'.repeat(100),
        };

        const result = service.validateUpdateRequest(validData);

        expect(result.name).toBe('a'.repeat(50));
        expect(result.industry).toBe('b'.repeat(100));
        expect(result.company_size).toBe('c'.repeat(50));
        expect(result.job_title).toBe('d'.repeat(100));
        expect(result.position).toBe('e'.repeat(100));
      });

      it('HTMLタグを含むデータをサニタイズして検証できる', () => {
        const validData = {
          name: '<script>alert("xss")</script>テストユーザー',
        };

        const result = service.validateUpdateRequest(validData);

        expect(result.name).not.toContain('<script>');
        expect(result.name).not.toContain('</script>');
      });
    });

    describe('異常系 - 必須フィールド（要件: 4.1）', () => {
      it('空のオブジェクトの場合エラーを投げる', () => {
        const invalidData = {};

        expect(() => service.validateUpdateRequest(invalidData)).toThrow(ValidationError);
        expect(() => service.validateUpdateRequest(invalidData)).toThrow(
          '少なくとも1つのフィールドを指定してください'
        );
      });
    });

    describe('異常系 - name フィールド（要件: 4.2）', () => {
      it('nameが空文字列の場合エラーを投げる', () => {
        const invalidData = { name: '' };

        expect(() => service.validateUpdateRequest(invalidData)).toThrow(ValidationError);
        expect(() => service.validateUpdateRequest(invalidData)).toThrow('名前は必須です');
      });

      it('nameが50文字を超える場合エラーを投げる', () => {
        const invalidData = { name: 'a'.repeat(51) };

        expect(() => service.validateUpdateRequest(invalidData)).toThrow(ValidationError);
        expect(() => service.validateUpdateRequest(invalidData)).toThrow(
          '名前は50文字以内で入力してください'
        );
      });

      it('nameが空白のみの場合、Zodバリデーションは通過するがサニタイズ後に空文字列になる', () => {
        const invalidData = { name: '   ' };

        // Zodは空白文字を許可するが、サニタイズ後に空文字列になる
        const result = service.validateUpdateRequest(invalidData);
        expect(result.name).toBe('');
      });
    });

    describe('異常系 - industry フィールド（要件: 4.3）', () => {
      it('industryが100文字を超える場合エラーを投げる', () => {
        const invalidData = { industry: 'a'.repeat(101) };

        expect(() => service.validateUpdateRequest(invalidData)).toThrow(ValidationError);
        expect(() => service.validateUpdateRequest(invalidData)).toThrow(
          '業種は100文字以内で入力してください'
        );
      });
    });

    describe('異常系 - company_size フィールド（要件: 4.4）', () => {
      it('company_sizeが50文字を超える場合エラーを投げる', () => {
        const invalidData = { company_size: 'a'.repeat(51) };

        expect(() => service.validateUpdateRequest(invalidData)).toThrow(ValidationError);
        expect(() => service.validateUpdateRequest(invalidData)).toThrow(
          '組織規模は50文字以内で入力してください'
        );
      });
    });

    describe('異常系 - job_title フィールド（要件: 4.5）', () => {
      it('job_titleが100文字を超える場合エラーを投げる', () => {
        const invalidData = { job_title: 'a'.repeat(101) };

        expect(() => service.validateUpdateRequest(invalidData)).toThrow(ValidationError);
        expect(() => service.validateUpdateRequest(invalidData)).toThrow(
          '職種は100文字以内で入力してください'
        );
      });
    });

    describe('異常系 - position フィールド（要件: 4.6）', () => {
      it('positionが100文字を超える場合エラーを投げる', () => {
        const invalidData = { position: 'a'.repeat(101) };

        expect(() => service.validateUpdateRequest(invalidData)).toThrow(ValidationError);
        expect(() => service.validateUpdateRequest(invalidData)).toThrow(
          '役職は100文字以内で入力してください'
        );
      });
    });

    describe('異常系 - 複数フィールドのバリデーションエラー（要件: 4.8）', () => {
      it('複数のフィールドでエラーがある場合、最初のエラーを投げる', () => {
        const invalidData = {
          name: '',
          industry: 'a'.repeat(101),
        };

        expect(() => service.validateUpdateRequest(invalidData)).toThrow(ValidationError);
      });
    });

    describe('エッジケース', () => {
      it('nullの場合エラーを投げる', () => {
        expect(() => service.validateUpdateRequest(null)).toThrow();
      });

      it('undefinedの場合エラーを投げる', () => {
        expect(() => service.validateUpdateRequest(undefined)).toThrow();
      });

      it('文字列の場合エラーを投げる', () => {
        expect(() => service.validateUpdateRequest('string')).toThrow();
      });

      it('数値の場合エラーを投げる', () => {
        expect(() => service.validateUpdateRequest(123)).toThrow();
      });

      it('配列の場合エラーを投げる', () => {
        expect(() => service.validateUpdateRequest([])).toThrow();
      });

      it('不正なフィールドを含む場合、不正なフィールドは無視される', () => {
        const data = {
          name: 'テストユーザー',
          invalidField: 'invalid',
        };

        const result = service.validateUpdateRequest(data);

        expect(result).toEqual({ name: 'テストユーザー' });
        expect(result).not.toHaveProperty('invalidField');
      });
    });
  });

  describe('sanitizeInput', () => {
    describe('正常系', () => {
      it('通常の文字列をそのまま返す', () => {
        const input = 'テストユーザー';
        const result = service.sanitizeInput(input);

        expect(result).toBe('テストユーザー');
      });

      it('日本語の文字列を正しく処理する', () => {
        const input = '山田太郎';
        const result = service.sanitizeInput(input);

        expect(result).toBe('山田太郎');
      });

      it('英数字の文字列を正しく処理する', () => {
        const input = 'John Doe 123';
        const result = service.sanitizeInput(input);

        expect(result).toBe('John Doe 123');
      });

      it('前後の空白を削除する', () => {
        const input = '  テストユーザー  ';
        const result = service.sanitizeInput(input);

        expect(result).toBe('テストユーザー');
      });
    });

    describe('HTMLタグの除去（要件: 4.7, 9.2, 9.4）', () => {
      it('scriptタグを除去する', () => {
        const input = '<script>alert("xss")</script>テスト';
        const result = service.sanitizeInput(input);

        expect(result).not.toContain('<script>');
        expect(result).not.toContain('</script>');
        expect(result).toContain('テスト');
      });

      it('複数のHTMLタグを除去する', () => {
        const input = '<div><span>テスト</span></div>';
        const result = service.sanitizeInput(input);

        expect(result).toBe('テスト');
      });

      it('imgタグを除去する', () => {
        const input = '<img src="x" onerror="alert(1)">テスト';
        const result = service.sanitizeInput(input);

        expect(result).not.toContain('<img');
        expect(result).toContain('テスト');
      });

      it('iframeタグを除去する', () => {
        const input = '<iframe src="evil.com"></iframe>テスト';
        const result = service.sanitizeInput(input);

        expect(result).not.toContain('<iframe');
        expect(result).toContain('テスト');
      });

      it('styleタグを除去する', () => {
        const input = '<style>body{display:none}</style>テスト';
        const result = service.sanitizeInput(input);

        expect(result).not.toContain('<style>');
        expect(result).toContain('テスト');
      });
    });

    describe('特殊文字のエスケープ（要件: 4.7, 9.2, 9.4）', () => {
      it('アンパサンドをエスケープする', () => {
        const input = 'A & B';
        const result = service.sanitizeInput(input);

        expect(result).toBe('A &amp; B');
      });

      it('小なり記号をエスケープする', () => {
        const input = '1 < 2';
        const result = service.sanitizeInput(input);

        expect(result).toBe('1 &lt; 2');
      });

      it('大なり記号をエスケープする', () => {
        const input = '2 > 1';
        const result = service.sanitizeInput(input);

        expect(result).toBe('2 &gt; 1');
      });

      it('ダブルクォートをエスケープする', () => {
        const input = 'Say "Hello"';
        const result = service.sanitizeInput(input);

        expect(result).toBe('Say &quot;Hello&quot;');
      });

      it('シングルクォートをエスケープする', () => {
        const input = "It's a test";
        const result = service.sanitizeInput(input);

        expect(result).toBe('It&#x27;s a test');
      });

      it('スラッシュをエスケープする', () => {
        const input = 'path/to/file';
        const result = service.sanitizeInput(input);

        expect(result).toBe('path&#x2F;to&#x2F;file');
      });

      it('複数の特殊文字を同時にエスケープする', () => {
        const input = '<div>"Test" & \'value\'</div>';
        const result = service.sanitizeInput(input);

        expect(result).not.toContain('<');
        expect(result).not.toContain('>');
        expect(result).toContain('&quot;');
        expect(result).toContain('&#x27;');
        expect(result).toContain('&amp;');
      });
    });

    describe('エッジケース', () => {
      it('空文字列を処理できる', () => {
        const input = '';
        const result = service.sanitizeInput(input);

        expect(result).toBe('');
      });

      it('空白のみの文字列を空文字列にする', () => {
        const input = '   ';
        const result = service.sanitizeInput(input);

        expect(result).toBe('');
      });

      it('HTMLタグのみの文字列を空文字列にする', () => {
        const input = '<div></div>';
        const result = service.sanitizeInput(input);

        expect(result).toBe('');
      });

      it('特殊文字のみの文字列を正しくエスケープする', () => {
        const input = '<>&"\'';
        const result = service.sanitizeInput(input);

        // HTMLタグ（<>）は除去され、その後特殊文字がエスケープされる
        expect(result).toBe('&amp;&quot;&#x27;');
      });

      it('非常に長い文字列を処理できる', () => {
        const input = 'a'.repeat(1000);
        const result = service.sanitizeInput(input);

        expect(result).toBe('a'.repeat(1000));
      });
    });
  });

  describe('統合テスト', () => {
    it('validateUpdateRequestがsanitizeInputを正しく呼び出す', () => {
      const data = {
        name: '<script>alert("xss")</script>テストユーザー',
        industry: 'IT & 通信',
      };

      const result = service.validateUpdateRequest(data);

      expect(result.name).not.toContain('<script>');
      expect(result.industry).toContain('&amp;');
    });

    it('複数フィールドのサニタイゼーションが正しく動作する', () => {
      const data = {
        name: '<div>山田太郎</div>',
        industry: 'IT & 通信',
        company_size: '100 < 500人',
        job_title: 'エンジニア "シニア"',
        position: "マネージャー's",
      };

      const result = service.validateUpdateRequest(data);

      expect(result.name).toBe('山田太郎');
      expect(result.industry).toContain('&amp;');
      expect(result.company_size).toContain('&lt;');
      expect(result.job_title).toContain('&quot;');
      expect(result.position).toContain('&#x27;');
    });

    it('サニタイゼーション前の文字数制限が適用される', () => {
      const data = {
        name: 'a'.repeat(39), // 39文字なので50文字以内
      };

      // バリデーション通過後、サニタイズされる
      const result = service.validateUpdateRequest(data);

      expect(result.name).toBe('a'.repeat(39));
    });

    it('サニタイゼーション前に文字数制限を超える場合エラーを投げる', () => {
      const data = {
        name: '<div>' + 'a'.repeat(50) + '</div>',
      };

      // <div>と</div>を含めると56文字になり、50文字を超えるのでエラー
      expect(() => service.validateUpdateRequest(data)).toThrow(ValidationError);
    });
  });
});

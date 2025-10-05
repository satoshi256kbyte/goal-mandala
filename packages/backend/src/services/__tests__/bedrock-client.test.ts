/**
 * Bedrockクライアントのテスト
 */

import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { getBedrockClient, resetBedrockClient } from '../bedrock-client.js';
import { MODEL_CONFIG } from '../../config/bedrock.config.js';

// モック設定
jest.mock('@aws-sdk/client-bedrock-runtime', () => {
  return {
    BedrockRuntimeClient: jest.fn().mockImplementation(() => {
      return {};
    }),
  };
});

describe('BedrockClient', () => {
  beforeEach(() => {
    // 各テスト前にクライアントをリセット
    resetBedrockClient();
    jest.clearAllMocks();
  });

  describe('getBedrockClient', () => {
    it('初回呼び出し時にBedrockRuntimeClientを初期化する', () => {
      const client = getBedrockClient();

      expect(BedrockRuntimeClient).toHaveBeenCalledTimes(1);
      expect(BedrockRuntimeClient).toHaveBeenCalledWith({
        region: MODEL_CONFIG.region,
      });
      expect(client).toBeDefined();
    });

    it('2回目以降の呼び出しでは同じインスタンスを返す（再利用）', () => {
      const client1 = getBedrockClient();
      const client2 = getBedrockClient();

      expect(BedrockRuntimeClient).toHaveBeenCalledTimes(1);
      expect(client1).toBe(client2);
    });

    it('リセット後は新しいインスタンスを作成する', () => {
      const client1 = getBedrockClient();
      resetBedrockClient();
      const client2 = getBedrockClient();

      expect(BedrockRuntimeClient).toHaveBeenCalledTimes(2);
      expect(client1).not.toBe(client2);
    });

    it('正しいリージョン設定でクライアントを初期化する', () => {
      getBedrockClient();

      expect(BedrockRuntimeClient).toHaveBeenCalledWith({
        region: MODEL_CONFIG.region,
      });
    });
  });

  describe('環境変数による設定', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('環境変数BEDROCK_REGIONが設定されている場合、その値を使用する', () => {
      process.env.BEDROCK_REGION = 'us-west-2';

      // 設定を再読み込み
      jest.isolateModules(() => {
        const { MODEL_CONFIG: config } = require('../../config/bedrock.config.js');
        expect(config.region).toBe('us-west-2');
      });
    });

    it('環境変数が未設定の場合、デフォルト値を使用する', () => {
      delete process.env.BEDROCK_REGION;

      jest.isolateModules(() => {
        const { MODEL_CONFIG: config } = require('../../config/bedrock.config.js');
        expect(config.region).toBe('ap-northeast-1');
      });
    });
  });
});

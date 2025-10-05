/**
 * Bedrockクライアント管理
 * Lambda関数のコールドスタート対策として、クライアントインスタンスを再利用します
 */

import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { MODEL_CONFIG } from '../config/bedrock.config.js';

/**
 * Bedrockクライアントのシングルトンインスタンス
 */
let bedrockClient: BedrockRuntimeClient | null = null;

/**
 * Bedrockクライアントを取得
 * 初回呼び出し時にクライアントを初期化し、以降は同じインスタンスを返します
 *
 * @returns BedrockRuntimeClient インスタンス
 */
export function getBedrockClient(): BedrockRuntimeClient {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region: MODEL_CONFIG.region,
    });
  }
  return bedrockClient;
}

/**
 * Bedrockクライアントをリセット
 * テスト用途で使用します
 */
export function resetBedrockClient(): void {
  bedrockClient = null;
}

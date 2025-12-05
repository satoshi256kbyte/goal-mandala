import fc from 'fast-check';
import { NotificationService } from '../notification.service';
import { Task, TaskStatus } from '@goal-mandala/shared';

// Note: このテストは@aws-sdk/client-sesが必要なためスキップ
// 将来的にSESクライアントを実装する際に有効化する
describe.skip('NotificationService Property-Based Tests', () => {
  it('placeholder test', () => {
    expect(true).toBe(true);
  });
});

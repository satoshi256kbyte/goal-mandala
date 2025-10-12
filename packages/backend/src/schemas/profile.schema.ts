import { z } from 'zod';

/**
 * プロフィール更新用Zodスキーマ
 */
export const ProfileUpdateSchema = z
  .object({
    name: z
      .string()
      .min(1, '名前は必須です')
      .max(50, '名前は50文字以内で入力してください')
      .optional(),
    industry: z.string().max(100, '業種は100文字以内で入力してください').optional(),
    company_size: z.string().max(50, '組織規模は50文字以内で入力してください').optional(),
    job_title: z.string().max(100, '職種は100文字以内で入力してください').optional(),
    position: z.string().max(100, '役職は100文字以内で入力してください').optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: '少なくとも1つのフィールドを指定してください',
  });

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;

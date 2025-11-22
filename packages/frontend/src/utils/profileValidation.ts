import { ProfileFormData, ProfileFormErrors } from '../types/profile';
import { INDUSTRIES } from '../constants/profile';

export const validateProfileForm = (data: ProfileFormData): ValidationResult => {
  const errors: ProfileFormErrors = {};

  // Industry validation
  if (!data.industry) {
    errors.industry = '業種を選択してください';
  } else if (!INDUSTRIES.some(industry => industry.value === data.industry)) {
    errors.industry = '有効な業種を選択してください';
  }

  // Company size validation
  if (!data.companySize) {
    errors.companySize = '組織規模を選択してください';
  } else if (!COMPANY_SIZES.some(size => size.value === data.companySize)) {
    errors.companySize = '有効な組織規模を選択してください';
  }

  // Job title validation
  if (!data.jobTitle) {
    errors.jobTitle = '職種を入力してください';
  } else if (data.jobTitle.length < 1) {
    errors.jobTitle = '職種を入力してください';
  } else if (data.jobTitle.length > 100) {
    errors.jobTitle = '職種は100文字以内で入力してください';
  }

  // Position validation (optional field)
  if (data.position && data.position.length > 100) {
    errors.position = '役職は100文字以内で入力してください';
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
  };
};

export const validateField = (field: keyof ProfileFormData, value: string): string | undefined => {
  const data: ProfileFormData = {
    industry: '',
    companySize: '',
    jobTitle: '',
    position: '',
    [field]: value,
  };

  const result = validateProfileForm(data);
  return result.errors[field];
};

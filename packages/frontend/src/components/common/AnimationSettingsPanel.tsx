import React, { useState, useEffect } from 'react';
import { useAnimationSettings } from '../../contexts/AnimationSettingsContext';
import {
  globalPerformanceMonitor,
  globalAccessibilityManager,
  type PerformanceMetrics,
  type PerformanceLevel,
} from '../../utils/animation-performance';

/**
 * アニメーション設定パネルのプロパティ
 */
interface AnimationSettingsPanelProps {
  /** パネルの表示・非表示 */
  isOpen: boolean;
  /** パネルを閉じる関数 */
  onClose: () => void;
  /** 設定変更時のコールバック */
  onChange?: (settings: any) => void;
}

/**
 * アニメーション設定パネルコンポーネント
 *
 * ユーザーがアニメーション設定をカスタマイズできるパネル
 */
export const AnimationSettingsPanel: React.FC<AnimationSettingsPanelProps> = ({
  isOpen,
  onClose,
  onChange,
}) => {
  const {
    settings,
    updateSettings,

    interruptAllAnimations,
  } = useAnimationSettings();

  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // パフォーマンスメトリクスの定期更新
  useEffect(() => {
    if (!isOpen || !settings.enablePerformanceMonitoring) {
      return;
    }

    const interval = setInterval(() => {
      const metrics = globalPerformanceMonitor.getMetrics();
      setPerformanceMetrics(metrics);
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, settings.enablePerformanceMonitoring]);

  // 設定変更ハンドラー
  const handleSettingChange = (key: string, value: any) => {
    const newSettings = { [key]: value };
    updateSettings(newSettings);

    if (onChange) {
      onChange({ ...settings, ...newSettings });
    }
  };

  // パフォーマンスレベル変更ハンドラー
  const handlePerformanceLevelChange = (level: PerformanceLevel) => {
    handleSettingChange('performanceLevel', level);
    globalPerformanceMonitor.setQualitySettings(level);
  };

  // アニメーション無効化の手動設定
  const handleManualDisable = (disabled: boolean) => {
    globalAccessibilityManager.setDisabled(disabled);
    if (disabled) {
      interruptAllAnimations();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">アニメーション設定</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="設定パネルを閉じる"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 基本設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">基本設定</h3>

            {/* アニメーション有効・無効 */}
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="animation-enabled" className="text-sm font-medium text-gray-700">
                  アニメーション
                </label>
                <p className="text-sm text-gray-500">進捗変化や達成時のアニメーション効果</p>
              </div>
              <label
                htmlFor="animation-enabled"
                className="relative inline-flex items-center cursor-pointer"
              >
                <span className="sr-only">アニメーションを有効にする</span>
                <input
                  id="animation-enabled"
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={e => handleSettingChange('enabled', e.target.checked)}
                  className="sr-only peer"
                />
                <span className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></span>
              </label>
            </div>

            {/* 達成アニメーション */}
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="achievement-enabled" className="text-sm font-medium text-gray-700">
                  達成アニメーション
                </label>
                <p className="text-sm text-gray-500">100%達成時の特別なアニメーション効果</p>
              </div>
              <label
                htmlFor="achievement-enabled"
                className="relative inline-flex items-center cursor-pointer"
              >
                <span className="sr-only">達成アニメーションを有効にする</span>
                <input
                  id="achievement-enabled"
                  type="checkbox"
                  checked={settings.achievementEnabled}
                  onChange={e => handleSettingChange('achievementEnabled', e.target.checked)}
                  disabled={!settings.enabled}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
              </label>
            </div>

            {/* システム設定の尊重 */}
            <div className="flex items-center justify-between">
              <div>
                <label
                  htmlFor="respect-reduced-motion"
                  className="text-sm font-medium text-gray-700"
                >
                  システム設定を尊重
                </label>
                <p className="text-sm text-gray-500">
                  「動きを減らす」設定が有効な場合はアニメーションを無効化
                </p>
              </div>
              <label
                htmlFor="respect-reduced-motion"
                className="relative inline-flex items-center cursor-pointer"
              >
                <span className="sr-only">システム設定を尊重する</span>
                <input
                  id="respect-reduced-motion"
                  type="checkbox"
                  checked={settings.respectReducedMotion}
                  onChange={e => handleSettingChange('respectReducedMotion', e.target.checked)}
                  className="sr-only peer"
                />
                <span className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></span>
              </label>
            </div>
          </div>

          {/* アニメーション速度設定 */}
          {settings.enabled && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">速度設定</h3>

              {/* 進捗アニメーション速度 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  進捗変化の速度: {settings.progressDuration}ms
                </label>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={settings.progressDuration}
                  onChange={e => handleSettingChange('progressDuration', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>高速 (100ms)</span>
                  <span>低速 (1000ms)</span>
                </div>
              </div>

              {/* 色変化アニメーション速度 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  色変化の速度: {settings.colorDuration}ms
                </label>
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={settings.colorDuration}
                  onChange={e => handleSettingChange('colorDuration', parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* 達成アニメーション速度 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  達成アニメーションの速度: {settings.achievementDuration}ms
                </label>
                <input
                  type="range"
                  min="200"
                  max="2000"
                  step="100"
                  value={settings.achievementDuration}
                  onChange={e =>
                    handleSettingChange('achievementDuration', parseInt(e.target.value))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  disabled={!settings.achievementEnabled}
                />
              </div>
            </div>
          )}

          {/* パフォーマンス設定 */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">パフォーマンス</h3>

            {/* パフォーマンスレベル */}
            <div>
              <label
                htmlFor="performance-level"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                品質レベル
              </label>
              <select
                id="performance-level"
                value={settings.performanceLevel}
                onChange={e => handlePerformanceLevelChange(e.target.value as PerformanceLevel)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="high">高品質（推奨）</option>
                <option value="medium">中品質</option>
                <option value="low">低品質（軽量）</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">デバイスの性能に応じて品質を調整します</p>
            </div>

            {/* パフォーマンス監視 */}
            <div className="flex items-center justify-between">
              <div>
                <label
                  htmlFor="performance-monitoring"
                  className="text-sm font-medium text-gray-700"
                >
                  パフォーマンス監視
                </label>
                <p className="text-sm text-gray-500">アニメーションのパフォーマンスを監視</p>
              </div>
              <label
                htmlFor="performance-monitoring"
                className="relative inline-flex items-center cursor-pointer"
              >
                <span className="sr-only">パフォーマンス監視を有効にする</span>
                <input
                  id="performance-monitoring"
                  type="checkbox"
                  checked={settings.enablePerformanceMonitoring}
                  onChange={e =>
                    handleSettingChange('enablePerformanceMonitoring', e.target.checked)
                  }
                  className="sr-only peer"
                />
                <span className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></span>
              </label>
            </div>

            {/* 自動品質調整 */}
            <div className="flex items-center justify-between">
              <div>
                <label htmlFor="auto-quality" className="text-sm font-medium text-gray-700">
                  自動品質調整
                </label>
                <p className="text-sm text-gray-500">パフォーマンスに応じて自動的に品質を調整</p>
              </div>
              <label
                htmlFor="auto-quality"
                className="relative inline-flex items-center cursor-pointer"
              >
                <span className="sr-only">自動品質調整を有効にする</span>
                <input
                  id="auto-quality"
                  type="checkbox"
                  checked={settings.enableAdaptiveQuality}
                  onChange={e => handleSettingChange('enableAdaptiveQuality', e.target.checked)}
                  className="sr-only peer"
                />
                <span className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></span>
              </label>
            </div>
          </div>

          {/* パフォーマンス情報 */}
          {performanceMetrics && settings.enablePerformanceMonitoring && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">パフォーマンス情報</h3>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="font-medium text-gray-700">フレームレート</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {performanceMetrics.fps} fps
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="font-medium text-gray-700">メモリ使用量</div>
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round(performanceMetrics.memoryUsage)} MB
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="font-medium text-gray-700">アクティブアニメーション</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {performanceMetrics.activeAnimations}
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="font-medium text-gray-700">フレームドロップ</div>
                  <div className="text-2xl font-bold text-red-600">
                    {performanceMetrics.droppedFrames}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 高度な設定 */}
          <div className="space-y-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              <span>高度な設定</span>
              <svg
                className={`w-4 h-4 ml-1 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showAdvanced && (
              <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                {/* イージング関数 */}
                <div>
                  <label
                    htmlFor="easing-function"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    イージング関数
                  </label>
                  <select
                    id="easing-function"
                    value={settings.easing}
                    onChange={e => handleSettingChange('easing', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ease-out">ease-out（推奨）</option>
                    <option value="ease-in">ease-in</option>
                    <option value="ease-in-out">ease-in-out</option>
                    <option value="linear">linear</option>
                  </select>
                </div>

                {/* 緊急停止ボタン */}
                <div>
                  <button
                    onClick={interruptAllAnimations}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    すべてのアニメーションを停止
                  </button>
                  <p className="text-sm text-gray-500 mt-1">
                    現在実行中のすべてのアニメーションを即座に停止します
                  </p>
                </div>

                {/* 手動無効化 */}
                <div>
                  <button
                    onClick={() => handleManualDisable(!globalAccessibilityManager.isDisabled())}
                    className={`w-full px-4 py-2 rounded-md transition-colors ${
                      globalAccessibilityManager.isDisabled()
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    }`}
                  >
                    {globalAccessibilityManager.isDisabled()
                      ? 'アニメーションを有効化'
                      : 'アニメーションを無効化'}
                  </button>
                  <p className="text-sm text-gray-500 mt-1">
                    システム設定に関係なく手動でアニメーションを制御します
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnimationSettingsPanel;

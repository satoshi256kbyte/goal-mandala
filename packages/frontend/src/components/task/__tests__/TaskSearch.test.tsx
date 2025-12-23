import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TaskSearch } from '../TaskSearch';

describe('TaskSearch', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render search input field', () => {
    render(<TaskSearch query="" onChange={() => {}} onSaveView={() => {}} />);

    expect(screen.getByPlaceholderText('タスクを検索...')).toBeInTheDocument();
  });

  it('should display current query value', () => {
    render(<TaskSearch query="test query" onChange={() => {}} onSaveView={() => {}} />);

    const input = screen.getByDisplayValue('test query');
    expect(input).toBeInTheDocument();
  });

  it('should call onChange with debounced input (300ms)', async () => {
    const onChange = vi.fn();

    render(<TaskSearch query="" onChange={onChange} onSaveView={() => {}} />);

    const input = screen.getByPlaceholderText('タスクを検索...');

    // 入力を行う
    fireEvent.change(input, { target: { value: 'test' } });

    // デバウンス時間前では呼ばれない
    expect(onChange).not.toHaveBeenCalled();

    // 300ms経過後に呼ばれる
    await new Promise(resolve => setTimeout(resolve, 350));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('test');
    });
  });

  it('should debounce multiple rapid inputs', async () => {
    const onChange = vi.fn();

    render(<TaskSearch query="" onChange={onChange} onSaveView={() => {}} />);

    const input = screen.getByPlaceholderText('タスクを検索...');

    // 連続して入力
    fireEvent.change(input, { target: { value: 't' } });
    fireEvent.change(input, { target: { value: 'te' } });
    fireEvent.change(input, { target: { value: 'tes' } });
    fireEvent.change(input, { target: { value: 'test' } });

    // 300ms経過後に最後の値のみで呼ばれる
    await new Promise(resolve => setTimeout(resolve, 350));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith('test');
    });
  });

  it('should show save view button when query is not empty', () => {
    render(<TaskSearch query="test" onChange={() => {}} onSaveView={() => {}} />);

    expect(screen.getByText('ビューを保存')).toBeInTheDocument();
  });

  it('should not show save view button when query is empty', () => {
    render(<TaskSearch query="" onChange={() => {}} onSaveView={() => {}} />);

    expect(screen.queryByText('ビューを保存')).not.toBeInTheDocument();
  });

  it('should call onSaveView when save button is clicked', () => {
    const onSaveView = vi.fn();

    render(<TaskSearch query="test query" onChange={() => {}} onSaveView={onSaveView} />);

    // ビューを保存ボタンをクリック
    const saveViewButton = screen.getByText('ビューを保存');
    fireEvent.click(saveViewButton);

    // ダイアログが表示される
    const viewNameInput = screen.getByPlaceholderText('ビュー名を入力...');
    fireEvent.change(viewNameInput, { target: { value: 'My View' } });

    // 保存ボタンをクリック
    const saveButton = screen.getByRole('button', { name: '保存' });
    fireEvent.click(saveButton);

    expect(onSaveView).toHaveBeenCalledWith('test query');
  });

  it('should clear search when clear button is clicked', () => {
    const onChange = vi.fn();

    render(<TaskSearch query="test query" onChange={onChange} onSaveView={() => {}} />);

    const clearButton = screen.getByLabelText('検索をクリア');
    fireEvent.click(clearButton);

    expect(onChange).toHaveBeenCalledWith('');
  });
});

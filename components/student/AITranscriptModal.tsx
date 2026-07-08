import * as React from 'react';
import { XCircle } from 'lucide-react';

interface Props {
  type: 'ai' | 'transcript';
  onClose: () => void;
  children: React.ReactNode;
}

export const AITranscriptModal: React.FC<Props> = ({ type, onClose, children }) => {
  return (
    <div className="dlv-modal" role="dialog" aria-modal="true">
      <div className="dlv-modal-header">
        <h2 className="dlv-modal-title">{type === 'ai' ? 'AI Tutor' : 'Transcript'}</h2>
        <button onClick={onClose} className="dlv-modal-close" aria-label="Close">
          <XCircle size={20} />
        </button>
      </div>
      <div className="dlv-modal-content">
        {children}
      </div>
    </div>
  );
};

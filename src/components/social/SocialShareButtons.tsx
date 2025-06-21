import { useState } from 'react';
import { 
  FacebookShareButton, 
  TwitterShareButton, 
  WhatsappShareButton, 
  EmailShareButton,
  FacebookIcon,
  TwitterIcon,
  WhatsappIcon,
  EmailIcon
} from 'react-share';
import { Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

interface SocialShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  hashtags?: string[];
  size?: number;
  round?: boolean;
  className?: string;
  compact?: boolean;
}

const SocialShareButtons = ({
  url,
  title,
  description = '',
  hashtags = ['memoriam'],
  size = 32,
  round = true,
  className = '',
  compact = false
}: SocialShareButtonsProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopied(true);
        toast.success('Link copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy link:', err);
        toast.error('Failed to copy link');
      });
  };

  return (
    <div className={`flex flex-wrap gap-2 items-center ${className}`}>
      {!compact && <span className="text-sm text-slate-600 mr-1">Share:</span>}
      
      <FacebookShareButton url={url} quote={title} hashtag={`#${hashtags[0]}`}>
        <FacebookIcon size={size} round={round} />
        <span className="sr-only">Share on Facebook</span>
      </FacebookShareButton>
      
      <TwitterShareButton url={url} title={title} hashtags={hashtags}>
        <TwitterIcon size={size} round={round} />
        <span className="sr-only">Share on Twitter</span>
      </TwitterShareButton>
      
      <WhatsappShareButton url={url} title={`${title}\n${description}`}>
        <WhatsappIcon size={size} round={round} />
        <span className="sr-only">Share on WhatsApp</span>
      </WhatsappShareButton>
      
      <EmailShareButton url={url} subject={title} body={`${description}\n\n${url}`}>
        <EmailIcon size={size} round={round} />
        <span className="sr-only">Share via Email</span>
      </EmailShareButton>
      
      <button 
        onClick={handleCopyLink}
        className={`
          flex items-center justify-center w-${size/8}rem h-${size/8}rem rounded-${round ? 'full' : 'md'}
          bg-slate-200 hover:bg-slate-300 transition-colors
        `}
        aria-label="Copy link to clipboard"
      >
        {copied ? (
          <Check size={size/2} className="text-emerald-600" />
        ) : (
          <Copy size={size/2} className="text-slate-700" />
        )}
      </button>
    </div>
  );
};

export default SocialShareButtons;
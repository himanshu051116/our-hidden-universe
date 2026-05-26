import { useOutletContext } from 'react-router-dom';
import ChatPanel from '../components/ChatPanel.jsx';

export default function UniverseChat() {
  const { setMessageCount, resetVersion } = useOutletContext();
  return <ChatPanel key={`chat-${resetVersion}`} onMessageCountChange={setMessageCount} />;
}

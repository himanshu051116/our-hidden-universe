import { useOutletContext } from 'react-router-dom';
import ChatPanel from '../components/ChatPanel.jsx';
import CallDiagnosticsPanel from '../components/call/CallDiagnosticsPanel.jsx';
import CallHistoryPanel from '../components/call/CallHistoryPanel.jsx';
import CallLaunchButtons from '../components/call/CallLaunchButtons.jsx';
import CallSetupCard from '../components/call/CallSetupCard.jsx';

export default function UniverseChat() {
  const { resetVersion } = useOutletContext();

  return (
    <>
      <CallLaunchButtons />
      <CallSetupCard />
      <CallDiagnosticsPanel />
      <ChatPanel key={`chat-${resetVersion}`} />
      <CallHistoryPanel />
    </>
  );
}

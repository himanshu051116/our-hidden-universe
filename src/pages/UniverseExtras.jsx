import { useOutletContext } from 'react-router-dom';
import ExtrasPanel from '../components/ExtrasPanel.jsx';

export default function UniverseExtras() {
  const { messageCount, resetVersion } = useOutletContext();
  return <ExtrasPanel key={`extras-${resetVersion}`} messageCount={messageCount} />;
}

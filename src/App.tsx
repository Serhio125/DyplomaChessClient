import React, {useEffect, useRef, useState} from 'react';
import './App.css';
function App() {
  const [message, setMessage] = useState<string>('');
  //TODO set condition on user token?
  return (
    <div className="App">
       <>Hello, world</>
    </div>
  );
}

export default App;

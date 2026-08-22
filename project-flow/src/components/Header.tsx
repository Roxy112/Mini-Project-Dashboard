import React from 'react';

export default function Header(): React.JSX.Element {
  return (
    <header>
      <h1>ProjectFlow</h1>
      <div className="user-profile">
        <h2>Elena</h2>
        <img src="gear-icon.png" alt="setting" />
      </div>
    </header>
  );
}

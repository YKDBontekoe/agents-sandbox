"use client";

import React from 'react';

export default function TestComponent() {
  console.log('TestComponent rendering');
  
  return (
    <div style={{ padding: '20px', border: '2px solid red', margin: '10px' }}>
      <h2>Test Component</h2>
      <p>If you can see this, React rendering is working.</p>
    </div>
  );
}
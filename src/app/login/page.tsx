'use client';

import { Authenticator } from "@aws-amplify/ui-react";
import { useEffect } from "react";

function RedirectHome() {
  useEffect(() => {
    window.location.href = '/';
  }, []);
  return null;
}

export default function AuthPage() {
  return (
    <div className="container mx-auto px-4 py-8 pt-24 my-auto">
      <Authenticator hideSignUp>
        {() => <RedirectHome />}
      </Authenticator>
    </div>
  );
}
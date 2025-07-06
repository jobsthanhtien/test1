
import React, { useState } from 'react';
import { Card, Input, Button } from '../components/ui';

interface LoginPageProps {
  onLogin: (username: string, password: string) => boolean;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = onLogin(username, password);
    if (!success) {
      setError('Tên đăng nhập hoặc mật khẩu không đúng.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-text-primary">CNC Operations</h1>
          <p className="text-text-secondary">Vui lòng đăng nhập để tiếp tục</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Tên đăng nhập"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          <Input
            label="Mật khẩu"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          {error && <p className="text-error text-sm text-center">{error}</p>}
          <Button type="submit" className="w-full">
            Đăng nhập
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default LoginPage;

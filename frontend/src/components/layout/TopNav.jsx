import React, { useState, useRef, useEffect } from 'react';
import { Wallet, CheckCircle, User, LogOut, Settings, Users, ChevronDown, PlusCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { CTX_ADDRESS } from '../../constants';

const TopNav = () => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Read user session from localStorage
  const userData = JSON.parse(localStorage.getItem('chitx_user') || '{}');
  const userName = userData.name || 'Guest';
  const walletAddress = userData.walletAddress || '';
  const shortWallet = walletAddress ? `${walletAddress.slice(0, 5)}...${walletAddress.slice(-4)}` : '—';

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('chitx_user');
    navigate('/');
  };

  const handleAddToken = async () => {
    try {
      if (!window.ethereum) return;
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: CTX_ADDRESS,
            symbol: 'CTX',
            decimals: 18,
          },
        },
      });
      setShowDropdown(false);
    } catch (error) {
      console.error('Failed to add token to MetaMask', error);
    }
  };

  return (
    <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-12">
        <Link to="/dashboard" className="text-2xl font-black text-slate-800 tracking-tighter">
          Chit<span className="text-teal-600">X</span>
        </Link>
        <nav className="flex items-center gap-8">
          {['Market', 'Staking', 'Analytics'].map((link) => (
            <Link
              key={link}
              to={`/${link.toLowerCase()}`}
              className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              {link}
            </Link>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="bg-teal-50 text-teal-700 px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-teal-100/50">
          <CheckCircle size={14} className="text-teal-600 fill-teal-100" />
          <span className="text-xs font-bold uppercase tracking-wider">ZK-Verified</span>
        </div>

        {/* Wallet Badge */}
        <div className="bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 flex items-center gap-2">
          <Wallet size={14} className="text-teal-600" />
          <span className="text-xs font-mono text-slate-600 font-medium">{shortWallet}</span>
        </div>
        
        {/* Profile Icon with Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-50 transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full border-2 border-slate-100 overflow-hidden p-0.5 hover:border-teal-200 transition-all">
              <div className="w-full h-full bg-teal-50 rounded-full flex items-center justify-center text-teal-600 font-bold text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
            </div>
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute right-0 top-14 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Profile Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-lg">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{userName}</p>
                    <p className="text-xs text-slate-400 font-mono">{shortWallet}</p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-2">
                <Link to="/settings" onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-sm text-slate-600 font-medium">
                  <Settings size={16} className="text-slate-400" />
                  Settings
                </Link>
                <Link to="/trust-score" onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-sm text-slate-600 font-medium">
                  <Users size={16} className="text-slate-400" />
                  Team & Trust Score
                </Link>
                <button onClick={handleAddToken}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-colors text-sm text-slate-600 font-medium w-full text-left">
                  <PlusCircle size={16} className="text-teal-500" />
                  Add CTX to MetaMask
                </button>
                <button onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 transition-colors text-sm text-red-500 font-medium w-full text-left">
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopNav;

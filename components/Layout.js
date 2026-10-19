import Link from 'next/link';
import { useAuth } from '../hooks/useAuth';
import { useState, useEffect, Children, cloneElement, useRef } from 'react';
import { supabase } from '../supabase/client'; // Import supabase client
import { useRouter } from 'next/router';

const Layout = ({ children }) => {
  const { user, loading, logout } = useAuth() || {};
  const [permissions, setPermissions] = useState(null); // Local state for permissions
  const [plant, setPlant] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);
  const router = useRouter();
  const isPublicPage = ['/', '/login', '/signup', '/forgot-password'].includes(router.pathname);

  // Effect to handle clicks outside of the menu to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch permissions and plants when the user is loaded
  useEffect(() => {
    if (loading) return;

    if (user) {
      const selectedPlant = localStorage.getItem('plant');
      if (selectedPlant) {
        setPlant(selectedPlant);
      } else if (!isPublicPage) {
        router.push('/login');
      }

      const fetchInitialData = async () => {
        // Fetch Permissions
        const { data: permissionsData } = await supabase
          .from('user_profiles')
          .select('permissions')
          .eq('id', user.id)
          .single();
        
        if (permissionsData) {
          setPermissions(permissionsData.permissions);
        }
      };
      fetchInitialData();
    } else if (!isPublicPage) {
      router.push('/login');
    }
  }, [user, loading, router.pathname]);

  const handleLogout = async () => {
      await logout();
      localStorage.removeItem('plant');
      setPlant(null);
      router.push('/login');
  };

  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  const childrenWithProps = Children.map(children, child => {
    if (child && typeof child.type === 'function') {
      return cloneElement(child, { plant });
    }
    return child;
  });

  const menuItems = {
    "Paper Roll": {
      prefix: "pr-",
      items: [
        { href: "/paper-roll/pr-dashboard", label: "Dashboard", permission: "pr-dashboard" },
        { href: "/paper-roll/pr-stock", label: "Paper Roll Stock", permission: "pr-stock" },
        { href: "/paper-roll/pr-stock-pivot", label: "Stock Pivot", permission: "pr-stock-pivot" },
        { href: "/paper-roll/pr-map", label: "Warehouse Map", permission: "pr-map" },
        { href: "/paper-roll/pr-issue", label: "Goods Issue", permission: "pr-issue" },
        { href: "/paper-roll/pr-movement", label: "Goods Movement", permission: "pr-movement" },
        { href: "/paper-roll/pr-receive", label: "Goods Receive", permission: "pr-receive" },
        { href: "/paper-roll/pr-return", label: "Goods Return", permission: "pr-return" },
        { href: "/paper-roll/pr-printlabel", label: "Print Label", permission: "pr-printlabel" },
        { href: "/paper-roll/pr-movement-history", label: "Movement History", permission: "pr-movement-history" },
        { href: "/paper-roll/pr-opname-report", label: "Opname Report", permission: "pr-opname-report" },
        { href: "/paper-roll/pr-stock-opname", label: "Stock Opname", permission: "pr-stock-opname" },
        { href: "/paper-roll/pr-upload-stock", label: "Upload Stock", permission: "pr-upload-stock" },
      ]
    },
    "Logistic": {
      prefix: "fg-",
      items: [
        { href: "/logistic/fg-outstanding", label: "Delivery Outstanding", permission: "fg-outstanding" },
        { href: "/logistic/fg-delivery-schedule", label: "Delivery Schedule", permission: "fg-delivery-schedule" },
        { href: "/logistic/fg-stock", label: "Stock", permission: "fg-stock" },
        { href: "/logistic/fg-loadingdock", label: "FG Loading Dock", permission: "fg-loadingdock" },
        { href: "/logistic/fg-receive", label: "Goods Receive", permission: "fg-receive" },
        { href: "/logistic/fg-removestock", label: "Remove Stock", permission: "fg-removestock" },
        { href: "/logistic/fg-customerreturn", label: "Customer Return", permission: "fg-customerreturn" },
        { href: "/logistic/fg-printlabel", label: "Print Label", permission: "fg-printlabel" },
        { href: "/logistic/fg-deliverynote", label: "Delivery Note", permission: "fg-deliverynote" },
        { href: "/logistic/fg-movement-history", label: "Movement History", permission: "fg-movement-history" },
        { href: "/logistic/fg-upload-delivery-schedule", label: "Upload Delivery Schedule", permission: "fg-upload-delivery-schedule" },
        { href: "/logistic/fg-upload-stock-identity", label: "Upload Stock Identity", permission: "fg-upload-stock-identity" },
        { href: "/logistic/fg-transporter-list", label: "Transporter", permission: "fg-transporter-list" },
      ]
    },
    "Account": {
      prefix: "ac-",
      items: [
        { href: "/account/ac-edit-account", label: "Edit Account", permission: "ac-edit-account" },
        { href: "/account/ac-authority-manager", label: "Authority Manager", permission: "ac-authority-manager" }
      ]
    },
  };

  // Use the local 'permissions' state for checks
  const hasPermission = (permission) => {
    if (permission === 'ac-edit-account') {
      return true;
    }
    return permissions?.includes(permission) ?? false;
  };

  const hasMenuAccess = (prefix) => {
    if (prefix === 'ac-') {
      return true;
    }
    return permissions?.some(p => p.startsWith(prefix)) ?? false;
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user && !isPublicPage) {
    return <div>Redirecting to login...</div>;
  }

  return (
    <div className="container">
      <header className="header">
        <h1>WES</h1>
        <nav ref={menuRef}>
          <ul style={{ display: 'flex', listStyle: 'none', padding: 0 }}>
            {user ? (
              <>
                {/* Render menus only if permissions are loaded */}
                {permissions && Object.keys(menuItems)
                  .filter(menu => hasMenuAccess(menuItems[menu].prefix))
                  .map(menu => (
                  <li key={menu} style={{ marginRight: '1rem' }}>
                    <a onClick={() => toggleMenu(menu)} style={{ cursor: 'pointer' }}>
                      {menu}
                    </a>
                    {openMenu === menu && (
                      <ul style={{ position: 'absolute', backgroundColor: 'white', border: '1px solid #ccc', listStyle: 'none', padding: '0.5rem', zIndex: 1000 }}>
                        {menuItems[menu].items
                          .filter(item => hasPermission(item.permission))
                          .map(item => (
                          <li key={item.href}>
                            <Link href={item.href} legacyBehavior><a>{item.label}</a></Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
                <li style={{ marginRight: '1rem' }}>
                  <button onClick={handleLogout}>Log Out</button>
                </li>
              </>
            ) : (
              <>
                <li style={{ marginRight: '1rem' }}>
                  <Link href="/signup" legacyBehavior><a>Sign Up</a></Link>
                </li>
                <li>
                  <Link href="/login" legacyBehavior><a>Login</a></Link>
                </li>
              </>
            )}
          </ul>
        </nav>
        {user && plant && <span>Welcome, {user?.user_metadata?.display_name} (Plant: {plant})</span>}
      </header>
      <main className="main">
        <div className="content">
           {(!user && !isPublicPage) ? <div>Redirecting to login...</div> : childrenWithProps}
        </div>
      </main>
    </div>
  );
};

export default Layout;

import React, { useState, useEffect } from 'react';
import { Container, Grid, Paper, Typography, Snackbar, Alert } from '@mui/material';
import { MenuItem, OrderItem } from '../types';
import { menuService } from '../services/menu';
import { orderService } from '../services/order/orderService';
import { useAuth } from '../hooks/useAuth';
import { MenuGrid } from './menu/MenuGrid';
import { OrderList } from './order/OrderList';
import { OrderSummary } from './order/OrderSummary';
import { LoadingSpinner } from './common/LoadingSpinner';
import { ErrorMessage } from './common/ErrorMessage';

export const OrderSystem: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const items = await menuService.getMenuItems();
        setMenuItems(items);
      } catch (err) {
        setError('Failed to load menu items');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMenuItems();
  }, []);

  const handleAddItem = (item: MenuItem) => {
    setOrderItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const handleUpdateQuantity = (id: number, quantity: number) => {
    if (quantity < 1) return;
    setOrderItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveItem = (id: number) => {
    setOrderItems(prev => prev.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleSubmitOrder = async () => {
    if (!user || orderItems.length === 0 || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const order = {
        id: crypto.randomUUID(),
        items: orderItems,
        total: calculateTotal(),
        timestamp: new Date().toISOString(),
        status: 'pending' as const,
        userId: user.id
      };

      await orderService.submitOrder(order);
      setOrderItems([]);
      setSuccessMessage('Order submitted successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to submit order');
      console.error('Order submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && <ErrorMessage message={error} />}
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Menu Items
            </Typography>
            <MenuGrid items={menuItems} onSelectItem={handleAddItem} />
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Current Order
            </Typography>
            <OrderList
              items={orderItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemoveItem}
            />
            <OrderSummary
              items={orderItems}
              onSubmit={handleSubmitOrder}
              submitting={submitting}
            />
          </Paper>
        </Grid>
      </Grid>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={() => setSuccessMessage(null)}
      >
        <Alert severity="success" onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};
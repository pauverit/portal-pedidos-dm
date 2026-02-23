import { useState, useEffect } from 'react';
import { CartItem, Product, User } from '../types';
import { calculateWeight } from '../lib/utils';

export function useCart(currentUser: User | null) {
    const [cart, setCart] = useState<CartItem[]>(() => {
        if (currentUser) {
            const savedCart = localStorage.getItem(`dm_portal_cart_${currentUser.id}`);
            return savedCart ? JSON.parse(savedCart) : [];
        }
        return [];
    });

    const getEffectiveProduct = (product: Product, user: User | null): Product => {
        if (!user || !user.customPrices) return product;
        const customPrice = user.customPrices[product.reference];
        if (customPrice !== undefined) {
            return {
                ...product,
                price: product.isFlexible ? 0 : customPrice,
                pricePerM2: product.isFlexible ? customPrice : undefined,
            };
        }
        return product;
    };

    const addToCart = (product: Product, quantity = 1, options?: any) => {
        setCart(prev => {
            let effectiveProduct = getEffectiveProduct(product, currentUser);

            if (options) {
                effectiveProduct = { ...effectiveProduct, ...options };
                const variantSuffix = Object.values(options).join('-');
                effectiveProduct.id = `${effectiveProduct.id}-${variantSuffix}`;

                const attributes = [];
                if (options.width) attributes.push(`${options.width}m`);
                if (options.finish) attributes.push(options.finish === 'gloss' ? 'Brillo' : 'Mate');
                if (options.backing) attributes.push(options.backing === 'black' ? 'Trasera Negra' : options.backing === 'gray' ? 'Trasera Gris' : 'Trasera Blanca');
                if (options.adhesive) attributes.push(options.adhesive === 'permanent' ? 'Permanente' : 'Removible');

                if (attributes.length > 0) {
                    effectiveProduct.name = `${effectiveProduct.name} [${attributes.join(', ')}]`;
                }
            }

            const existing = prev.find(item => item.id === effectiveProduct.id);
            const calculatedPrice = effectiveProduct.isFlexible
                ? (effectiveProduct.width! * effectiveProduct.length! * effectiveProduct.pricePerM2!)
                : effectiveProduct.price;

            const itemWeight = calculateWeight(effectiveProduct);

            if (existing) {
                return prev.map(item =>
                    item.id === effectiveProduct.id ? { ...item, quantity: item.quantity + quantity } : item
                );
            }
            return [...prev, {
                ...effectiveProduct,
                quantity,
                calculatedPrice,
                weight: itemWeight
            }];
        });
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, quantity: item.quantity + delta };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const clearCart = () => setCart([]);

    // Synchronization logic
    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(`dm_portal_cart_${currentUser.id}`, JSON.stringify(cart));
        }
    }, [cart, currentUser]);

    useEffect(() => {
        if (currentUser) {
            const savedCart = localStorage.getItem(`dm_portal_cart_${currentUser.id}`);
            if (savedCart) {
                setCart(JSON.parse(savedCart));
            }
        } else {
            setCart([]);
        }
    }, [currentUser?.id]);

    return {
        cart,
        setCart,
        addToCart,
        updateQuantity,
        clearCart
    };
}

import { apiRequest } from '@api/http-client';
import { menuListingSchema, type TMenuListing } from '../business/schemas';

export async function listMenu(): Promise<TMenuListing> {
  const data = await apiRequest('/items');
  return menuListingSchema.parse(data);
}

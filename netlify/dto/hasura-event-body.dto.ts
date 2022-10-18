import { Orders } from '../common/sdk';

export enum HasuraEvents {
  ORDER_CREATED = 'order_created',
}

export interface HasuraEventBody {
  created_at: string;
  delivery_info: Deliveryinfo;
  event: Event;
  id: string;
  table: Table;
  trigger: Trigger;
}

interface Trigger {
  name: HasuraEvents;
}

interface Table {
  name: string;
  schema: string;
}

interface Event {
  data: Data;
  op: string;
  session_variables: Sessionvariables;
  trace_context: Tracecontext;
}

interface Tracecontext {
  span_id: string;
  trace_id: string;
}

interface Sessionvariables {
  'x-hasura-role': string;
}

interface Data {
  new: Pick<
    Orders,
    'client_address' | 'client_name' | 'client_phone' | 'status' | 'id'
  >;
  old?: any;
}

interface Deliveryinfo {
  current_retry: number;
  max_retries: number;
}

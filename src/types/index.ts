export type UserRole = 'admin' | 'supervisor' | 'canes' | 'caza' | 'client';
export type SpeciesType = 'Perro' | 'Gato' | 'Murciélago' | 'Conejo' | 'Paloma';
export type AnimalSex = 'Macho' | 'Hembra' | 'Indeterminado';
export type AnimalSize = 'Pequeño' | 'Mediano' | 'Grande';
export type ApparentAge = 'Cachorro/juvenil' | 'Adulto' | 'Senior' | 'Indeterminada';
export type AnimalStatus = 'Capturado' | 'En canil' | 'Entregado' | 'Pendiente Adopción' | 'Finalizado' | 'Liberado' | 'Escapó';
export type EventResult = 'Captura total' | 'Captura parcial' | 'Animales escaparon' | 'Sin hallazgo';
export type ClosureType = 'Captura total' | 'Captura parcial' | 'Abandono' | 'Sin hallazgo';
export type UrgencyLevel = 'Normal' | 'Urgente' | 'Crítica';
export type RequestStatus = 'Pendiente' | 'En curso' | 'Completada' | 'Cancelada';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  rut?: string;
  active: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  rut?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  notification_emails?: string[];
  address?: string;
  is_contract_client: boolean; // DGAC
  can_request_service: boolean;
  whatsapp_group_id?: string;
  active: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  name: string;
  line: string;
  description?: string;
}

export interface ClientService {
  id: string;
  client_id: string;
  service_id: string;
  price_per_animal: number;
  enabled: boolean;
}

export interface Round {
  id: string;
  operator_id: string;
  round_date: string;
  start_time: string;
  end_time?: string;
  zone: string;
  observations?: string;
  has_fence_incident: boolean;
  created_at: string;
  operator?: Profile;
  fence_incidents?: FenceIncident[];
}

export interface FenceIncident {
  id: string;
  round_id: string;
  damage_description: string;
  action_taken: string;
  was_repaired: boolean;
  damage_photo_urls: string[];
  repair_photo_urls: string[];
  email_sent: boolean;
  created_at: string;
}

export interface EventActivation {
  id: string;
  event_code: string;
  client_id: string;
  operator_id: string;
  requested_by?: string;
  handover_person_name?: string;
  handover_entity?: string;
  handover_id_photo_url?: string;
  event_type: string;
  event_date: string;
  notice_time?: string;
  intervention_time?: string;
  end_time?: string;
  specific_location: string;
  airport_zone: string;
  situation_description: string;
  general_result: EventResult;
  observations?: string;
  has_perimeter_damage: boolean;
  damage_location?: string;
  damage_description?: string;
  damage_photo_urls?: string[];
  damage_repaired?: boolean;
  repair_photo_urls?: string[];
  closure_type?: ClosureType | string;
  closure_observations?: string;
  closed_at?: string;
  closed_by?: string;
  status: string;
  created_at: string;
  client?: Client;
  operator?: Profile;
  closed_by_profile?: Profile;
  animal_records?: AnimalRecord[];
}

export interface AnimalRecord {
  id: string;
  event_id: string;
  species: SpeciesType;
  sex: AnimalSex;
  size?: AnimalSize;
  color_features?: string;
  apparent_age?: ApparentAge;
  apparent_condition?: string;
  method?: string;
  observations?: string;
  photo_urls: string[];
  was_captured: boolean;
  invoice_pdf_url?: string;
  animal_status: AnimalStatus;
  created_at: string;
  event?: EventActivation;
}

export interface AdoptionRecord {
  id: string;
  animal_id: string;
  microchip_number: string;
  adopter_name: string;
  adopter_rut: string;
  adopter_phone: string;
  adopter_address: string;
  rnm_pdf_url: string;
  completed_by: string;
  completed_at: string;
}

export interface KennelRecord {
  id: string;
  animal_id: string;
  species: SpeciesType;
  entry_datetime: string;
  entry_responsible: string;
  exit_datetime?: string;
  exit_responsible?: string;
  status: 'En canil' | 'Retirado';
  animal?: AnimalRecord;
}

export interface KennelCleaning {
  id: string;
  cleaning_datetime: string;
  operator_id: string;
  cleaning_type: string;
  observations?: string;
  photo_url?: string;
  created_at: string;
  operator?: Profile;
  animals_covered?: AnimalRecord[];
}

export interface DeliveryAct {
  id: string;
  act_number: string;
  event_id: string;
  client_id: string;
  animal_id: string;
  capture_datetime: string;
  capture_location: string;
  species: SpeciesType;
  sex: AnimalSex;
  size?: AnimalSize;
  color_features?: string;
  apparent_age?: ApparentAge;
  delivery_datetime: string;
  delivering_user: string;
  receiver_name: string;
  receiver_rut: string;
  receiver_organization?: string;
  receiver_address?: string;
  receiver_phone?: string;
  receiver_email?: string;
  observations?: string;
  annexes: {
    photo_record: boolean;
    rnm_proof: boolean;
    other?: string;
  };
  generated_pdf_url?: string;
  signed_scan_url?: string;
  created_at: string;
  client?: Client;
  animal?: AnimalRecord;
}

export interface ServiceRequest {
  id: string;
  client_id: string;
  service_type: 'Canes' | 'Caza';
  description: string;
  location: string;
  urgency: UrgencyLevel;
  photo_urls: string[];
  status: RequestStatus;
  assigned_to?: string;
  created_at: string;
  resolved_at?: string;
  client?: Client;
}

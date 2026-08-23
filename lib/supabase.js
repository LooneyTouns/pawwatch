// lib/supabase.js — Client Supabase
// 👉 Remplace les valeurs par celles de ton projet sur supabase.com

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://bewtumzhhuskrevlqdqb.supabase.co';       // ← à remplacer
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJld3R1bXpoaHVza3JldmxxZHFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4NDc0NzIsImV4cCI6MjA5ODQyMzQ3Mn0.ii8inJwS0N8dhB2sVg37couV2r_ZvQqfLtVm0uSc2po';                     // ← à remplacer

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── AUTH ────────────────────────────────────────────────────────
export async function signUp(email, password, nom, role) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { nom, role } },
  });
  if (error) throw error;
  await supabase.from('users').insert({
    id: data.user.id, email, nom, role,
  });
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user ?? null;
}

// ─── GARDES ──────────────────────────────────────────────────────
export async function getGardesEnCours(userId, role) {
  const col = role === 'proprietaire' ? 'proprio_id' : 'gardien_id';
  const { data, error } = await supabase
    .from('gardes')
    .select(`*, animaux(*), users!gardien_id(nom), journaux(*)`)
    .eq(col, userId)
    .eq('statut', 'en_cours');
  if (error) throw error;
  return data;
}

export async function creerGarde(payload) {
  const { data, error } = await supabase.from('gardes').insert(payload).select().single();
  if (error) throw error;
  return data;
}

// ─── JOURNAUX ────────────────────────────────────────────────────
export async function getJournaux(gardeId) {
  const { data, error } = await supabase
    .from('journaux')
    .select(`*, photos(*)`)
    .eq('garde_id', gardeId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function soumettreJournal(gardeId, payload) {
  const { data, error } = await supabase
    .from('journaux')
    .insert({ garde_id: gardeId, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function validerJournal(journalId) {
  const { error } = await supabase
    .from('journaux')
    .update({ vu_par_proprio: true, vu_at: new Date().toISOString() })
    .eq('id', journalId);
  if (error) throw error;
}

// ─── PHOTOS ──────────────────────────────────────────────────────
export async function uploadPhoto(journalId, type, uri) {
  // Convertir l'URI locale en blob
  const response = await fetch(uri);
  const blob = await response.blob();
  const ext = uri.split('.').pop();
  const path = `journaux/${journalId}/${type}_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('pawwatch-photos')
    .upload(path, blob, { contentType: `image/${ext}` });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('pawwatch-photos').getPublicUrl(path);

  await supabase.from('photos').insert({
    journal_id: journalId,
    type,          // 'repas' | 'promenade'
    url: data.publicUrl,
    heure: new Date().toISOString(),
  });

  return data.publicUrl;
}

// ─── PAIEMENTS ───────────────────────────────────────────────────
export async function getPaiement(gardeId) {
  const { data, error } = await supabase
    .from('paiements')
    .select('*')
    .eq('garde_id', gardeId)
    .single();
  if (error) throw error;
  return data;
}

export async function debloquerPaiement(gardeId) {
  const { error } = await supabase
    .from('paiements')
    .update({ statut: 'debloque', debloque_at: new Date().toISOString() })
    .eq('garde_id', gardeId);
  if (error) throw error;
}

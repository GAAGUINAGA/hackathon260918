import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ssot_api_client/ssot_api_client.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../config/env.dart';

/// Adjunta el JWT vigente de Supabase a cada petición (ADR-05, RT-01):
/// `apps/api` deriva `owner_id` solo de ese token, nunca de un parámetro
/// del cliente. Se lee la sesión en cada request (no una sola vez al
/// construir el cliente) para seguir el refresco automático de
/// `supabase_flutter`.
class _BearerTokenInterceptor extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = Supabase.instance.client.auth.currentSession?.accessToken;
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }
}

final apiClientProvider = Provider<SsotApiClient>((ref) {
  return SsotApiClient(
    basePathOverride: Env.apiBaseUrl,
    interceptors: [_BearerTokenInterceptor()],
  );
});

final contactsApiProvider = Provider<ContactsApi>((ref) {
  return ref.watch(apiClientProvider).getContactsApi();
});

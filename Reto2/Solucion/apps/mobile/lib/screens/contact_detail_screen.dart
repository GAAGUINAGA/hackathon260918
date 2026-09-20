import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ssot_api_client/ssot_api_client.dart';

import '../api/api_client_provider.dart';

final _contactDetailProvider = FutureProvider.autoDispose.family<ContactSummaryResponse, String>((ref, id) async {
  final api = ref.watch(contactsApiProvider);
  final response = await api.contactsControllerFindById(id: id);
  return response.data!;
});

/// UC-12: consultar detalle de contacto. Inexistente/ajeno/retirado -> 404
/// (RT-15), tratado aquí como "no encontrado", nunca como error genérico.
class ContactDetailScreen extends ConsumerWidget {
  const ContactDetailScreen({required this.contactId, super.key});

  final String contactId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final contactAsync = ref.watch(_contactDetailProvider(contactId));

    return Scaffold(
      appBar: AppBar(title: const Text('Detalle de contacto')),
      body: contactAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) {
          final isNotFound = error is DioException && error.response?.statusCode == 404;
          return Center(
            child: Text(
              isNotFound
                  ? 'No existe, no te pertenece o fue retirado a la papelera.'
                  : 'No se pudo cargar el contacto.',
            ),
          );
        },
        data: (contact) => Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(contact.displayName ?? '(sin nombre)', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 16),
              _DetailRow(label: 'Empresa', value: contact.company),
              _DetailRow(label: 'Correo principal', value: contact.primaryEmail),
              _DetailRow(label: 'Teléfono principal', value: contact.primaryPhone),
            ],
          ),
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  const _DetailRow({required this.label, required this.value});

  final String label;
  final String? value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Semantics(
        label: '$label: ${value ?? "sin dato"}',
        child: ExcludeSemantics(
          child: Row(
            children: [
              SizedBox(width: 140, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w600))),
              Expanded(child: Text(value ?? '—')),
            ],
          ),
        ),
      ),
    );
  }
}

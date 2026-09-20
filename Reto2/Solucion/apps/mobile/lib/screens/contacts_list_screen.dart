import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';
import 'package:go_router/go_router.dart';
import 'package:ssot_api_client/ssot_api_client.dart';

import '../api/api_client_provider.dart';
import '../auth/auth_providers.dart';

final _searchTermProvider = StateProvider.autoDispose<String?>((ref) => null);

final _contactsListProvider = FutureProvider.autoDispose<ListContactsResponse>((ref) async {
  final api = ref.watch(contactsApiProvider);
  final searchTerm = ref.watch(_searchTermProvider);
  final response = await api.contactsControllerList(searchTerm: searchTerm, limit: 25);
  return response.data!;
});

/// UC-11: buscar, filtrar y listar contactos (papelera y demás filtros:
/// fuera del alcance de apps/api hoy, ver apps/web para el mismo límite).
class ContactsListScreen extends ConsumerWidget {
  const ContactsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final contactsAsync = ref.watch(_contactsListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Contactos'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Cerrar sesión',
            onPressed: () => ref.read(authControllerProvider).signOut(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => context.push('/contacts/new'),
        tooltip: 'Nuevo contacto',
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              decoration: const InputDecoration(labelText: 'Buscar contactos', prefixIcon: Icon(Icons.search)),
              textInputAction: TextInputAction.search,
              onSubmitted: (value) => ref.read(_searchTermProvider.notifier).state = value.trim().isEmpty ? null : value.trim(),
            ),
          ),
          Expanded(
            child: contactsAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => Center(
                child: Text(
                  error is DioException ? 'No se pudieron cargar los contactos.' : 'Error inesperado.',
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
              data: (page) {
                if (page.items.isEmpty) {
                  return const Center(child: Text('Sin resultados.'));
                }
                return RefreshIndicator(
                  onRefresh: () => ref.refresh(_contactsListProvider.future),
                  child: ListView.separated(
                    itemCount: page.items.length,
                    separatorBuilder: (context, index) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final contact = page.items[index];
                      final subtitle = [
                        contact.company,
                        contact.primaryEmail,
                        contact.primaryPhone,
                      ].whereType<String>().where((value) => value.isNotEmpty).join(' · ');

                      return ListTile(
                        title: Text(contact.displayName ?? '(sin nombre)'),
                        subtitle: subtitle.isEmpty ? null : Text(subtitle),
                        onTap: () => context.push('/contacts/${contact.id}'),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

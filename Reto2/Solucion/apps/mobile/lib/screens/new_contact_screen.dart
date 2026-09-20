import 'package:built_collection/built_collection.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ssot_api_client/ssot_api_client.dart';

import '../api/api_client_provider.dart';

/// UC-01: crear contacto local. Igual que en `apps/web`, la pantalla
/// ofrece un correo y un teléfono (marcados como principales): la API
/// admite varios por contacto, pero no hay caso de uso hoy que exija una
/// UI de listas dinámicas (KISS).
class NewContactScreen extends ConsumerStatefulWidget {
  const NewContactScreen({super.key});

  @override
  ConsumerState<NewContactScreen> createState() => _NewContactScreenState();
}

class _NewContactScreenState extends ConsumerState<NewContactScreen> {
  final _displayNameController = TextEditingController();
  final _companyController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();

  bool _isSubmitting = false;
  String? _generalError;
  String? _displayNameError;

  @override
  void dispose() {
    _displayNameController.dispose();
    _companyController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    setState(() {
      _isSubmitting = true;
      _generalError = null;
      _displayNameError = null;
    });

    final displayName = _displayNameController.text.trim();
    final company = _companyController.text.trim();
    final email = _emailController.text.trim();
    final phone = _phoneController.text.trim();

    final request = ContactsControllerCreateRequest((b) {
      if (displayName.isNotEmpty) b.displayName = displayName;
      if (company.isNotEmpty) b.company = company;
      if (email.isNotEmpty) {
        b.emails = ListBuilder([ContactsControllerCreateRequestEmailsInner((e) => e..raw = email..isPrincipal = true)]);
      }
      if (phone.isNotEmpty) {
        b.phones = ListBuilder([ContactsControllerCreateRequestPhonesInner((p) => p..raw = phone..isPrincipal = true)]);
      }
    });

    try {
      final api = ref.read(contactsApiProvider);
      final response = await api.contactsControllerCreate(contactsControllerCreateRequest: request);
      if (!mounted) return;
      context.replace('/contacts/${response.data!.contactId}');
    } on DioException catch (error) {
      if (!mounted) return;
      final body = error.response?.data;
      final message = (body is Map && body['message'] is String) ? body['message'] as String : 'No se pudo crear el contacto.';
      final field = (body is Map && body['field'] is String) ? body['field'] as String : null;
      setState(() {
        _isSubmitting = false;
        if (field == 'displayName') {
          _displayNameError = message;
        } else {
          _generalError = message;
        }
      });
      return;
    }

    if (mounted) setState(() => _isSubmitting = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Nuevo contacto')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(
              controller: _displayNameController,
              decoration: InputDecoration(labelText: 'Nombre', errorText: _displayNameError),
            ),
            const SizedBox(height: 12),
            TextField(controller: _companyController, decoration: const InputDecoration(labelText: 'Empresa')),
            const SizedBox(height: 12),
            TextField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'Correo electrónico'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Teléfono'),
            ),
            const SizedBox(height: 16),
            if (_generalError != null)
              Semantics(
                liveRegion: true,
                child: Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(_generalError!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
                ),
              ),
            FilledButton(
              onPressed: _isSubmitting ? null : _submit,
              child: Text(_isSubmitting ? 'Creando…' : 'Crear contacto'),
            ),
          ],
        ),
      ),
    );
  }
}

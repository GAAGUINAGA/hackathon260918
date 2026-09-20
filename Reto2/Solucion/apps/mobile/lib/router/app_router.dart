import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_providers.dart';
import '../screens/contact_detail_screen.dart';
import '../screens/contacts_list_screen.dart';
import '../screens/login_screen.dart';
import '../screens/new_contact_screen.dart';

/// UC-08: redirige a `/login` sin sesión; go_router reevalúa el redirect
/// cuando `currentSessionProvider` cambia gracias a `refreshListenable`.
final appRouterProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/contacts',
    refreshListenable: _SessionListenable(ref),
    redirect: (context, state) {
      final hasSession = ref.read(currentSessionProvider) != null;
      final goingToLogin = state.matchedLocation == '/login';

      if (!hasSession && !goingToLogin) return '/login';
      if (hasSession && goingToLogin) return '/contacts';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (context, state) => const LoginScreen()),
      GoRoute(path: '/contacts', builder: (context, state) => const ContactsListScreen()),
      GoRoute(path: '/contacts/new', builder: (context, state) => const NewContactScreen()),
      GoRoute(
        path: '/contacts/:id',
        builder: (context, state) => ContactDetailScreen(contactId: state.pathParameters['id']!),
      ),
    ],
  );
});

class _SessionListenable extends ChangeNotifier {
  _SessionListenable(this._ref) {
    _subscription = _ref.listen(currentSessionProvider, (previous, next) {
      if (previous?.accessToken != next?.accessToken) notifyListeners();
    });
  }

  final Ref _ref;
  late final ProviderSubscription<dynamic> _subscription;

  @override
  void dispose() {
    _subscription.close();
    super.dispose();
  }
}

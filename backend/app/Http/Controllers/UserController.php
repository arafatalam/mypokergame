<?php

namespace App\Http\Controllers;

use App\Actions\Games\ListPlayerGameHistory;
use App\Actions\Users\GetAssignableRoles;
use App\Actions\Users\GetProfilePhotoPath;
use App\Actions\Users\ListUsers;
use App\Actions\Users\SaveUser;
use App\Actions\Users\UpdateUserDetails;
use App\Enums\RoleCode;
use App\Http\Requests\Users\IndexUsersRequest;
use App\Http\Requests\Users\StoreUserRequest;
use App\Http\Requests\Users\UpdateUserRequest;
use App\Http\Resources\PlayerGameHistoryResource;
use App\Http\Resources\UserListResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(IndexUsersRequest $request, ListUsers $listUsers): AnonymousResourceCollection
    {
        $actor = $request->user();
        $validated = $request->validated();

        $search = $validated['search'] ?? '';
        $role = $validated['role'] ?? '';

        $query = $listUsers->query($actor, $search, $role);

        // Keep both filters when moving between pages.
        $users = $query->paginate(5)->appends([
            'search' => $search,
            'role' => $role,
        ]);

        $roleOptions = $listUsers->getRoleOptions($actor->role);

        // Include filter choices alongside the account list.
        $response = UserListResource::collection($users)->additional([
            'role_options' => $roleOptions,
        ]);

        return $response;
    }

    public function createOptions(Request $request, GetAssignableRoles $getAssignableRoles): JsonResponse
    {
        $actor = $request->user();
        $allowedRoles = $getAssignableRoles->get($actor);
        $roleOptions = [];

        // Give React both the stored value and its visible label.
        foreach ($allowedRoles as $role) {
            $roleOptions[] = [
                'value' => $role->value,
                'label' => $role->label(),
            ];
        }

        $responseData = [
            'roles' => $roleOptions,
        ];

        return response()->json($responseData);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreUserRequest $request, SaveUser $saveUser): JsonResponse
    {
        // Only validated account details reach the saving action.
        $validated = $request->validated();
        $result = $saveUser->save($validated);
        $user = $result['user'];

        // Send the generated credential in this creation response.
        $responseData = [
            'message' => 'Account created successfully.',
            'username' => $user->username,
            'generated_password' => $result['generated_password'],
        ];

        return response()->json($responseData, 201, [
            'Cache-Control' => 'no-store',
        ]);
    }

    public function playerTab(Request $request, User $user): JsonResponse
    {
        abort_unless($user->role === RoleCode::PLAYER, 404);

        // Use the effective payment date, including when staff backdate a payment.
        $lastPayment = DB::table('payments')->where('player_id', $user->id)->where('amount', '>', 0)
            ->orderByDesc('paid_at')->orderByDesc('id')->first(['amount', 'paid_at']);

        $lastGame = DB::table('player_game_visits as visits')
            ->join('game_sessions as games', 'games.id', '=', 'visits.game_session_id')
            ->where('visits.player_id', $user->id)
            ->orderByDesc('games.game_date')->orderByDesc('games.game_number')
            ->first(['games.game_name', 'games.game_date']);

        $data = [
            'player_since' => $user->created_at->toDateString(),
            'balance' => $user->poker_balance,
            'can_record_payment' => $request->user()->can('recordPayment', User::class)
                && $user->is_active,
            'last_payment' => $lastPayment,
            'last_game' => $lastGame,
        ];

        return response()->json(['data' => $data]);
    }

    /**
     * Display the specified resource.
     */
    public function gameHistory(User $user, ListPlayerGameHistory $history): AnonymousResourceCollection
    {
        $games = $history->get($user);

        return PlayerGameHistoryResource::collection($games);
    }

    public function show(Request $request, User $user): JsonResponse
    {
        $responseData = $this->profileData($user, $request->user());

        return response()->json($responseData);
    }

    /**
     * Use the same profile fields for the initial load and the successful save.
     *
     * @return array{id: int, username: string, first_name: string, last_name: string, email: string, phone: string|null, photo_url: string, can_change_photo: bool, can_change_password: bool, can_view_payment_history: bool, can_view_game_history: bool, has_uploaded_photo: bool}
     */
    private function profileData(User $user, User $actor): array
    {
        // Use the same protected portrait route as User List.
        $photoUrl = route(
            'api.v1.users.photo',
            ['user' => $user->id],
            false
        );

        $responseData = [
            'id' => $user->id,
            'username' => $user->username,
            'first_name' => $user->first_name,
            'last_name' => $user->last_name,
            'email' => $user->email,
            'phone' => $user->phone,
            'photo_url' => $photoUrl,
            'can_change_photo' => $actor->can('updatePhoto', $user),
            'can_change_password' => $actor->can('updatePassword', $user),
            'can_view_payment_history' => $user->role === RoleCode::PLAYER && $actor->can('recordPayment', User::class),
            'can_view_game_history' => $actor->can('viewGameHistory', $user),
            'has_uploaded_photo' => GetProfilePhotoPath::isUpload($user->profile_image_path),
        ];

        return $responseData;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateUserRequest $request, User $user, UpdateUserDetails $updateUserDetails): JsonResponse
    {
        // Only fields accepted by UpdateUserRequest can reach the database.
        $validated = $request->validated();
        $savedUser = $updateUserDetails->save($user, $validated);

        $responseData = $this->profileData($savedUser, $request->user());
        $responseData['message'] = 'Account details saved.';

        return response()->json($responseData);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
